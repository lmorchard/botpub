"use strict";

const config = require("../lib/config");
const response = require("../lib/response");
const html = require("../lib/html");

module.exports.get = async (event, context) => {
  const { log, bots, HOSTNAME, SITE_URL } = await config({
    event,
    context,
  });

  const { queryStringParameters } = event;
  const { resource = "" } = (queryStringParameters || {});
  const [rType, rName, rHostname] = resource.split(/[:@]/);

  if (
    rType !== "acct" ||
    rHostname !== HOSTNAME ||
    !bots.hasOwnProperty(rName)
  ) {
    log.warning("notfound", { resource, HOSTNAME, bots: Object.keys(bots) });
    return response.notFound({ event });
  }

  log.info("found", { resource });
  return response({
    event,
    headers: { "Cache-Control": "max-age=31536000, immutable" },
    jsonType: "application/jrd+json",
    html: html.webfinger,
    data: {
      subject: resource,
      links: [
        {
          rel: "self",
          type: "application/activity+json",
          href: `${SITE_URL}/${rName}/actor.json`,
        },
      ],
    },
  });
};
