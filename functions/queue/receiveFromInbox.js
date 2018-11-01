const AWS = require("aws-sdk");

const { sendNote } = require("../../lib/activities");
const { fetchJson } = require("../../lib/request");
const { withContext } = require("../../lib/utils");

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
    if (bot.onCreateNote) {
      return bot.onCreateNote(commonParams);
    }
  }
  if (activity.type == "Like") {
    if (bot.onCreateNote) {
      return bot.onLike(commonParams);
    }
  }
  if (activity.type == "Announce" && activity.object.startsWith(SITE_URL)) {
    if (bot.onBoost) {
      return bot.onBoost(commonParams);
    }
  }
  if (activity.type == "Follow") {
    await storeFollower({ config, bot, actorDeref });
    if (bot.onFollow) {
      return bot.onFollow(commonParams);
    }
  }
  if (activity.type == "Undo" && object.type == "Follow") {
    await deleteFollower({ config, bot, actorDeref });
    if (bot.onUnfollow) {
      return bot.onUnfollow(commonParams);
    }
  }
  return Promise.resolve();
};

const actorToFollowId = actor => Buffer.from(actor, "utf8").toString("base64");

async function storeFollower({ config, bot, actorDeref }) {
  const S3 = new AWS.S3({ apiVersion: "2006-03-01" });
  const { enqueue } = require("./index");
  const { log, STATIC_BUCKET: Bucket } = config;
  const {
    profile: { name },
  } = bot;

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
  const {
    profile: { name },
  } = bot;

  log.info("unfollow", { actorDeref });

  const followId = actorToFollowId(actorDeref.id);

  const deleteResult = await S3.deleteObject({
    Bucket,
    Key: `${name}/followers/${followId}.json`,
  }).promise();

  log.debug("unfollowDelete", { deleteResult });

  await enqueue.updateSharedInboxes({ config });
}
