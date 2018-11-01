const AWS = require("aws-sdk");
const html = require("./html");
const { dateNow, uid, withContext } = require("./utils");

exports.ID_PUBLIC = "https://www.w3.org/ns/activitystreams#Public";

exports.createNote = ({
  baseUrl,
  attributedTo,
  inReplyTo,
  to,
  cc,
  content,
  mentions = [],
  uuid = uid(),
  published = dateNow(),
}) => ({
  type: "Create",
  uuid,
  id: `${baseUrl}/objects/Create/${uuid}.json`,
  url: `${baseUrl}/objects/Create/${uuid}.html`,
  actor: attributedTo,
  published,
  to,
  cc,
  object: {
    type: "Note",
    id: `${baseUrl}/objects/Note/${uuid}.json`,
    url: `${baseUrl}/objects/Note/${uuid}.html`,
    published,
    attributedTo,
    inReplyTo,
    to,
    cc,
    tag: mentions.map(({ id: href }) => ({ type: "Mention", href })),
    content: noteContent({ content, mentions }),
  },
});

const noteContent = ({ content, mentions }) =>
  ["<p>", mentions.map(mention).join(""), content, "</p>"].join("");

const mention = ({ url, preferredUsername }) =>
  `<span class="h-card"><a href="${url}" class="u-url mention">@<span>${preferredUsername}</span></a> `;

// TODO: This is basically outbox functionality, maybe we can move it there?
exports.deliverActivity = async ({ config, activity, bot, inboxes = [] }) => {
  const S3 = new AWS.S3({ apiVersion: "2006-03-01" });
  const { enqueue } = require("../functions/queue/index");
  const { log, STATIC_BUCKET: Bucket } = config;

  // Publish activity to web reources.
  try {
    await exports.publishActivity({ config, bot, activity });
  } catch (error) {
    log.error("publishActivityError", { error });
    return;
  }

  let deliveryInboxes = [...inboxes];

  // TODO: Deliver to inboxes from follower collections in to / cc?

  try {
    if (
      activity.to.includes(exports.ID_PUBLIC) ||
      activity.cc.includes(exports.ID_PUBLIC)
    ) {
      deliveryInboxes = deliveryInboxes.concat(
        await S3.getObject({
          Bucket,
          Key: "sharedInboxes.json",
        })
          .promise()
          .then(result => JSON.parse(result.Body.toString("utf-8")))
      );
    }
  } catch (error) {
    log.error("sharedInboxDeliveryFailure", { error: error.toString() });
  }

  try {
    const {
      profile: { name },
    } = bot;
    await Promise.all(
      deliveryInboxes.map(inbox =>
        enqueue.deliverToRemoteInbox({
          config,
          body: { name, inbox, activity },
        })
      )
    );
  } catch (error) {
    log.error("deliveryFailure", { error: error.toString() });
  }
};

exports.publishActivity = async ({ config, bot, activity }) => {
  const S3 = new AWS.S3({ apiVersion: "2006-03-01" });
  const { log, STATIC_BUCKET: Bucket } = config;
  const {
    profile: { name },
  } = bot;
  const { uuid, object } = activity;
  const putResult = await Promise.all([
    S3.putObject({
      Bucket,
      Key: `${name}/objects/${object.type}/${uuid}.json`,
      ContentType: "application/activity+json; charset=utf-8",
      Body: JSON.stringify(withContext(object), null, "  "),
    }).promise(),
    S3.putObject({
      Bucket,
      Key: `${name}/objects/${object.type}/${uuid}.html`,
      ContentType: "text/html; charset=utf-8",
      Body: await html.object(object),
    }).promise(),
    S3.putObject({
      Bucket,
      Key: `${name}/objects/${activity.type}/${uuid}.json`,
      ContentType: "application/activity+json; charset=utf-8",
      Body: JSON.stringify(withContext(activity), null, "  "),
    }).promise(),
    S3.putObject({
      Bucket,
      Key: `${name}/objects/${activity.type}/${uuid}.html`,
      ContentType: "text/html; charset=utf-8",
      Body: await html.object(activity),
    }).promise(),
  ]);
  log.debug("putCreateNoteActivity", { putResult });
};
