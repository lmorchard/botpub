"use strict";

const AWS = require("aws-sdk");
const S3 = new AWS.S3({ apiVersion: "2006-03-01" });

module.exports = async ({ body, config }) => {
  const { bots, log, STATIC_BUCKET: Bucket } = config;

  let sharedInboxes = [];

  for (let name of Object.keys(bots)) {
    // Get a list of followers - TODO: paginate if over 1000?
    const listResult = await S3.listObjects({
      Bucket,
      Prefix: `${name}/followers/`,
      MaxKeys: 1000,
    }).promise();

    // Fetch all the followers sequentially - TODO: do in batches?
    for (let { Key } of listResult.Contents) {
      const result = await S3.getObject({ Bucket, Key }).promise();
      const follower = JSON.parse(result.Body.toString("utf-8"));
      sharedInboxes.push(follower.enpoints.sharedInbox);
    }
  }

  // Save the new list of shared inboxes
  const putResult = await S3.putObject({
    Bucket,
    Key: "sharedInboxes.json",
    ContentType: "application/json; charset=utf-8",
    Body: JSON.stringify(Array.from(new Set(sharedInboxes))),
  }).promise();

  log.debug("sharedInboxesPutResult", { putResult });
  log.info("reindexSharedInboxes", { count: sharedInboxes.length });
};
