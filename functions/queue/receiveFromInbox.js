const AWS = require("aws-sdk");

const { createNote } = require("../../lib/activities");
const { dateNow, uid, withContext } = require("../../lib/utils");
const { fetchJson } = require("../../lib/request");
const html = require("../../lib/html");

module.exports = async ({ body, config }) => {
  const { log, bots, SITE_URL } = config;
  const { name, activity = {} } = body;
  const { actor, object = {} } = activity;

  const bot = bots[name];
  if (!bot) {
    log.error("botNotFound", { name, bots: Object.keys(bots) });
    return { error: "nobot" };
  }

  await bot.init();

  if (activity.type == "Delete" && actor == activity.object) {
    // Ignore reports of deleted users.
    log.debug("userDeleted", { actor });
    return { result: "delete" };
  }

  let actorDeref;
  try {
    actorDeref = await fetchJson(actor);
  } catch (error) {
    log.error("actorFetchFailure", { body, actor, error: error.toString() });
    return false;
  }

  if (actorDeref.type !== "Person") {
    // Skip interacting with actors who aren't people. Hopefully this keeps our
    // bots from getting into conversational loops.
    log.warning("actorIsNotPerson", { body, actor });
    return false;
  }

  const send = content =>
    sendNote({
      inReplyTo: object.url,
      config,
      bot,
      actor,
      actorDeref,
      content,
    });

  const commonParams = { config, name, bot, activity, send, actorDeref };

  if (activity.type == "Create" && object.type == "Note") {
    return bot.onCreateNote(commonParams);
  }
  if (activity.type == "Like") {
    return bot.onLike(commonParams);
  }
  if (activity.type == "Announce" && activity.object.startsWith(SITE_URL)) {
    return bot.onBoost(commonParams);
  }
  if (activity.type == "Follow") {
    await storeFollower({ config, bot, actorDeref });
    return bot.onFollow(commonParams);
  }
  if (activity.type == "Undo" && object.type == "Follow") {
    await deleteFollower({ config, bot, actorDeref });
    return bot.onUnfollow(commonParams);
  }
  return Promise.resolve();
};

const actorToFollowId = actor => Buffer.from(actor, "utf8").toString("base64");

async function storeFollower({ config, bot, actorDeref }) {
  const S3 = new AWS.S3({ apiVersion: "2006-03-01" });
  const { enqueue } = require("./index");
  const { log, STATIC_BUCKET: Bucket } = config;
  const { profile: { name } } = bot;

  log.info("follow", { actorDeref });

  const followId = actorToFollowId(actorDeref.id);

  const putResult = await S3.putObject({
    Bucket,
    Key: `${name}/followers/${followId}.json`,
    ContentType: "application/activity+json; charset=utf-8",
    Body: JSON.stringify(withContext(actorDeref), null, "  "),
  }).promise();

  log.debug("followPut", { putResult });

  await enqueue.updateSharedInboxes({ config });
}

async function deleteFollower({ config, bot, actorDeref }) {
  const S3 = new AWS.S3({ apiVersion: "2006-03-01" });
  const { enqueue } = require("./index");
  const { log, STATIC_BUCKET: Bucket } = config;
  const { profile: { name } } = bot;

  log.info("unfollow", { actorDeref });

  const followId = actorToFollowId(actorDeref.id);

  const deleteResult = await S3.deleteObject({
    Bucket,
    Key: `${name}/followers/${followId}.json`,
  }).promise();

  log.debug("unfollowDelete", { deleteResult });

  await enqueue.updateSharedInboxes({ config });
}

async function sendNote({
  config,
  bot,
  actor,
  actorDeref,
  inReplyTo,
  content,
}) {
  const S3 = new AWS.S3({ apiVersion: "2006-03-01" });
  const { enqueue } = require("./index");
  const {
    log,
    SITE_URL: siteURL,
    STATIC_BUCKET: Bucket,
  } = config;
  const { profile: { name } } = bot;
  const objectUuid = uid();
  const activity = createNote({
    bot,
    objectUuid,
    actorURL: bot.id,
    siteURL,
    config,
    actor,
    actorDeref,
    content,
    inReplyTo,
    published: dateNow(),
  });
  try {
    await publishActivity({
      bot,
      activity,
      objectUuid,
      config,
      actor,
      actorDeref,
      inReplyTo: activity.object.url,
      content,
    });
  } catch (error) {
    log.error("publishActivityError", { error: error.toString() });
    return;
  }
  try {
    await enqueue.deliverToRemoteInbox({
      config,
      body: { name, inbox: actorDeref.inbox, activity },
    });
  } catch (error) {
    log.error("inboxDeliveryFailure", { error: error.toString() });
  }
  try {
    const sharedInboxes = await S3.getObject({
      Bucket,
      Key: "sharedInboxes.json",
    })
      .promise()
      .then(result => JSON.parse(result.Body.toString("utf-8")));
    for (let inbox of sharedInboxes) {
      await enqueue.deliverToRemoteInbox({
        config,
        body: { name, inbox, activity },
      });
    }
  } catch (error) {
    log.error("sharedInboxDeliveryFailure", { error: error.toString() });
  }
}

async function publishActivity({
  bot,
  activity,
  objectUuid,
  config,
  actor,
  actorDeref,
  content,
  inReplyTo,
}) {
  const S3 = new AWS.S3({ apiVersion: "2006-03-01" });
  const { log, STATIC_BUCKET: Bucket } = config;
  const { profile: { name } } = bot;
  const putResult = await Promise.all([
    S3.putObject({
      Bucket,
      Key: `${name}/objects/Note/${objectUuid}.json`,
      ContentType: "application/activity+json; charset=utf-8",
      Body: JSON.stringify(withContext(activity.object), null, "  "),
    }).promise(),
    S3.putObject({
      Bucket,
      Key: `${name}/objects/Note/${objectUuid}.html`,
      ContentType: "text/html; charset=utf-8",
      Body: await html.object(activity.object),
    }).promise(),
    S3.putObject({
      Bucket,
      Key: `${name}/objects/Create/${objectUuid}.json`,
      ContentType: "application/activity+json; charset=utf-8",
      Body: JSON.stringify(withContext(activity), null, "  "),
    }).promise(),
    S3.putObject({
      Bucket,
      Key: `${name}/objects/Create/${objectUuid}.html`,
      ContentType: "text/html; charset=utf-8",
      Body: await html.object(activity),
    }).promise(),
  ]);
  log.debug("putCreateNoteActivity", { putResult });
}
