const AWS = require("aws-sdk");

const insults = require("../../lib/insults");
const { createNote } = require("../../lib/activities");
const { dateNow, uid, withContext } = require("../../lib/utils");
const { fetchJson } = require("../../lib/request");
const html = require("../../lib/html");

module.exports = async ({ body, config }) => {
  const { log, SITE_URL } = config;
  const { activity = {} } = body;
  const { actor, object = {} } = activity;

  await insults.init();

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

  const send = content =>
    sendNote({
      inReplyTo: object.url,
      config,
      actor,
      actorDeref,
      content,
    });

  if (activity.type == "Create" && object.type == "Note") {
    return send(await insults.generate());
  }

  if (activity.type == "Like") {
    return send(`Oh you liked that, did you? ${await insults.generate()}`);
  }

  if (activity.type == "Announce" && activity.object.startsWith(SITE_URL)) {
    return send(`Thank you for the boost, ${await insults.generate()}`);
  }

  if (activity.type == "Follow") {
    return handleFollow({ config, send, actor, actorDeref });
  }

  if (activity.type == "Undo" && object.type == "Follow") {
    return handleUnfollow({
      config,
      send,
      activity,
      object,
      actor,
      actorDeref,
    });
  }

  return Promise.resolve();
};

const actorToFollowId = actor => Buffer.from(actor, "utf8").toString("base64");

async function handleFollow({ config, send, actor, actorDeref }) {
  const S3 = new AWS.S3({ apiVersion: "2006-03-01" });
  const { enqueue } = require("./index");
  const { log, STATIC_BUCKET: Bucket } = config;

  log.info("follow", { actor, actorDeref });

  const followId = actorToFollowId(actor);

  const putResult = await S3.putObject({
    Bucket,
    Key: `followers/${followId}.json`,
    ContentType: "application/activity+json; charset=utf-8",
    Body: JSON.stringify(withContext(actorDeref), null, "  "),
  }).promise();

  log.debug("followPut", { putResult });

  await enqueue.updateSharedInboxes({ config });

  return send(`Thanks for the follow, ${await insults.generate()}`);
}

async function handleUnfollow({ config, send, actor }) {
  const S3 = new AWS.S3({ apiVersion: "2006-03-01" });
  const { enqueue } = require("./index");
  const { log, STATIC_BUCKET: Bucket } = config;

  log.info("unfollow", { actor });

  const followId = actorToFollowId(actor);

  const deleteResult = await S3.deleteObject({
    Bucket,
    Key: `followers/${followId}.json`,
  }).promise();

  log.debug("unfollowDelete", { deleteResult });

  await enqueue.updateSharedInboxes({ config });

  return send(`I will miss you, ${await insults.generate()}`);
}

async function sendNote({ config, actor, actorDeref, inReplyTo, content }) {
  const S3 = new AWS.S3({ apiVersion: "2006-03-01" });
  const { enqueue } = require("./index");
  const {
    log,
    ACTOR_URL: actorURL,
    SITE_URL: siteURL,
    STATIC_BUCKET: Bucket,
  } = config;
  const objectUuid = uid();
  const activity = createNote({
    objectUuid,
    actorURL,
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
      body: { inbox: actorDeref.inbox, activity },
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
      await enqueue.deliverToRemoteInbox({ config, body: { inbox, activity } });
    }
  } catch (error) {
    log.error("sharedInboxDeliveryFailure", { error: error.toString() });
  }
}

async function publishActivity({
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
  const putResult = await Promise.all([
    S3.putObject({
      Bucket,
      Key: `objects/Note/${objectUuid}.json`,
      ContentType: "application/activity+json; charset=utf-8",
      Body: JSON.stringify(withContext(activity.object), null, "  "),
    }).promise(),
    S3.putObject({
      Bucket,
      Key: `objects/Note/${objectUuid}.html`,
      ContentType: "text/html; charset=utf-8",
      Body: await html.object(activity.object),
    }).promise(),
    S3.putObject({
      Bucket,
      Key: `objects/Create/${objectUuid}.json`,
      ContentType: "application/activity+json; charset=utf-8",
      Body: JSON.stringify(withContext(activity), null, "  "),
    }).promise(),
    S3.putObject({
      Bucket,
      Key: `objects/Create/${objectUuid}.html`,
      ContentType: "text/html; charset=utf-8",
      Body: await html.object(activity),
    }).promise(),
  ]);
  log.debug("putCreateNoteActivity", { putResult });
}
