const AWS = require("aws-sdk");
const html = require("./html");
const { dateNow, uid, withContext } = require("./utils");

const ID_PUBLIC = "https://www.w3.org/ns/activitystreams#Public";

// TODO: Split sendNote and publishNote out into separate reusable functions

exports.sendNote = async ({
  config,
  bot,
  actor,
  actorDeref,
  inReplyTo,
  content,
}) => {
  const S3 = new AWS.S3({ apiVersion: "2006-03-01" });
  const { enqueue } = require("../functions/queue/index");
  const { log, SITE_URL: siteURL, STATIC_BUCKET: Bucket } = config;
  const {
    profile: { name },
  } = bot;
  const objectUuid = uid();
  const activity = exports.createNote({
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
    await exports.publishActivity({
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
};

exports.createNote = ({
  bot,
  objectUuid,
  siteURL,
  actorURL,
  config,
  actor,
  actorDeref,
  content,
  inReplyTo,
  published,
}) => {
  const {
    profile: { name },
  } = bot;
  const { followers, url, preferredUsername } = actorDeref;

  const object = {
    type: "Note",
    id: `${siteURL}/${name}/objects/Note/${objectUuid}.json`,
    url: `${siteURL}/${name}/objects/Note/${objectUuid}.html`,
    published,
    attributedTo: actorURL,
    inReplyTo,
    to: [ID_PUBLIC],
    cc: [actor, followers],
    tag: [{ type: "Mention", href: actor }],
    content: `<p><span class="h-card"><a href="${url}" class="u-url mention">@<span>${preferredUsername}</span></a> </span>${content}</p>`,
  };

  const activity = {
    id: `${siteURL}/${name}/objects/Create/${objectUuid}.json`,
    url: `${siteURL}/${name}/objects/Create/${objectUuid}.html`,
    type: "Create",
    actor: actorURL,
    published,
    to: object.to,
    cc: object.cc,
    object,
  };

  return activity;
};

exports.publishActivity = async ({
  bot,
  activity,
  objectUuid,
  config,
  actor,
  actorDeref,
  content,
  inReplyTo,
}) => {
  const S3 = new AWS.S3({ apiVersion: "2006-03-01" });
  const { log, STATIC_BUCKET: Bucket } = config;
  const {
    profile: { name },
  } = bot;
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
};
