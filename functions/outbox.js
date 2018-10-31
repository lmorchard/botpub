"use strict";

const AWS = require("aws-sdk");
const S3 = new AWS.S3({ apiVersion: "2006-03-01" });

const config = require("../lib/config");
const response = require("../lib/response");
const html = require("../lib/html");

const MAX_ITEMS = 15;

module.exports.get = async (event, context) => {
  const { log, bots, SITE_URL, STATIC_BUCKET: Bucket } = await config({
    event,
    context,
  });

  const { pathParameters = {} } = event;
  const { name = "" } = pathParameters;

  if (!bots.hasOwnProperty(name)) {
    // TODO: implement shared inbox?
    log.warning("notfound", { name, bots: Object.keys(bots) });
    return response.notFound({ event });
  }

  // TODO: Better error handling for these S3 requests

  const listResult = await S3.listObjects({
    Bucket,
    Prefix: `${name}/objects/Create/`,
    MaxKeys: MAX_ITEMS,
  }).promise();

  const items = await Promise.all(
    listResult.Contents.filter(filterJson).map(({ Key }) =>
      S3.getObject({ Bucket, Key })
        .promise()
        .then(parseActivity)
    )
  );

  const orderedItems = items.sort(cmpObjectsPublished);

  log.info("summary");

  return response({
    event,
    headers: { "Cache-Control": "max-age=10" },
    html: html.outbox,
    data: {
      id: `${SITE_URL}/${name}/outbox`,
      type: "OrderedCollection",
      orderedItems,
    },
  });
};

const filterJson = ({ Key }) => Key.endsWith(".json");

const parseActivity = result => {
  const data = JSON.parse(result.Body.toString("utf-8"));
  delete data["@context"];
  return data;
};

const cmpObjectsPublished = ({ published: ap }, { published: bp }) =>
  bp.localeCompare(ap);
