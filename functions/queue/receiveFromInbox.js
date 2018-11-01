const AWS = require("aws-sdk");

const {
  createNote,
  deliverActivity,
  ID_PUBLIC,
} = require("../../lib/activities");
const { fetchJson } = require("../../lib/request");
const { withContext } = require("../../lib/utils");

module.exports = async ({ body, config }) => {
  const { log, bots, SITE_URL } = config;
  const { name, activity = {} } = body;

  if (activity.type == "Delete" && activity.actor == activity.object) {
    // Ignore reports of deleted users. (We get a lot of them.)
    log.debug("userDeleted", { activity });
    return { result: "delete" };
  }

  // Grab and initialize the named bot.
  const bot = bots[name];
  if (!bot) {
    log.error("botNotFound", { name, bots: Object.keys(bots) });
    return { error: "nobot" };
  }
  await bot.init();

  let { actor, object = {} } = activity;
  if (typeof actor === "string") {
    // Dereference the actor if it's a URL string. (It usually is.)
    try {
      actor = await fetchJson(actor);
    } catch (error) {
      log.error("actorDerefFailure", { body, actor, error: error.toString() });
      return false;
    }
  }

  if (actor.type !== "Person") {
    // Only interact with people. Hopefully keeps bots out of loops.
    log.warning("actorIsNotPerson", { body, actor });
    return false;
  }

  const send = content =>
    deliverActivity({
      bot,
      config,
      inboxes: [actor.inbox],
      activity: createNote({
        baseUrl: bot.baseUrl,
        attributedTo: bot.actor.id,
        inReplyTo: object.url,
        to: [ID_PUBLIC],
        cc: [actor.id, actor.followers],
        mentions: [actor],
        content,
      }),
    });

  const commonParams = { config, name, bot, activity, send, actor };

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
    await storeFollower({ config, bot, actor });
    if (bot.onFollow) {
      return bot.onFollow(commonParams);
    }
  }
  if (activity.type == "Undo" && object.type == "Follow") {
    await deleteFollower({ config, bot, actor });
    if (bot.onUnfollow) {
      return bot.onUnfollow(commonParams);
    }
  }
  return Promise.resolve();
};

const actorToFollowId = actor => Buffer.from(actor, "utf8").toString("base64");

async function storeFollower({ config, bot, actor }) {
  const S3 = new AWS.S3({ apiVersion: "2006-03-01" });
  const { enqueue } = require("./index");
  const { log, STATIC_BUCKET: Bucket } = config;
  const {
    profile: { name },
  } = bot;

  log.info("follow", { actor });

  const followId = actorToFollowId(actor.id);

  const putResult = await S3.putObject({
    Bucket,
    Key: `${name}/followers/${followId}.json`,
    ContentType: "application/activity+json; charset=utf-8",
    Body: JSON.stringify(withContext(actor), null, "  "),
  }).promise();

  log.debug("followPut", { putResult });

  await enqueue.updateSharedInboxes({ config });
}

async function deleteFollower({ config, bot, actor }) {
  const S3 = new AWS.S3({ apiVersion: "2006-03-01" });
  const { enqueue } = require("./index");
  const { log, STATIC_BUCKET: Bucket } = config;
  const {
    profile: { name },
  } = bot;

  log.info("unfollow", { actor });

  const followId = actorToFollowId(actor.id);

  const deleteResult = await S3.deleteObject({
    Bucket,
    Key: `${name}/followers/${followId}.json`,
  }).promise();

  log.debug("unfollowDelete", { deleteResult });

  await enqueue.updateSharedInboxes({ config });
}
