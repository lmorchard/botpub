"use strict";

const setupConfig = require("../lib/config");
const response = require("../lib/response");
const { verifyRequest } = require("../lib/httpSignatures");

const { enqueue } = require("./queue");

module.exports.post = async (event, context) => {
  const config = await setupConfig({ event, context });
  const { log, bots, HOSTNAME } = config;

  const {
    httpMethod: method,
    path,
    pathParameters = {},
    headers,
    body,
  } = event;
  const { name = "" } = pathParameters;

  if (!bots.hasOwnProperty(name)) {
    // TODO: implement shared inbox?
    log.warning("notfound", { name, bots: Object.keys(bots) });
    return response.notFound({ event });
  }

  let activity;
  try {
    activity = JSON.parse(body);
  } catch (e) {
    log.error("malformedBody", { body });
    return response.badRequest({ event, data: { error: "malformed body" } });
  }

  // Skip verification for Delete because the public key will be gone.
  if (activity.type !== "Delete") {
    try {
      const signatureVerified = await verifyRequest({
        method,
        path,
        headers: Object.assign({}, headers, { Host: HOSTNAME }),
      });
      if (!signatureVerified) {
        log.warning("invalidSignature", { method, path, headers });
        return response.forbidden({
          event,
          data: { error: "invalid HTTP signature" },
        });
      }
    } catch (e) {
      log.error("signatureVerificationFailed", { error: e });
      return response.forbidden({
        event,
        data: { error: "HTTP signature validation failed" },
      });
    }
  }

  try {
    const result = await enqueue.receiveFromInbox({
      config,
      body: { name, activity },
    });
    log.info("inboxEnqueued", { result });
  } catch (error) {
    log.error("inboxEnqueueError", { error: error.toString() });
  }

  return response.accepted({ event });
};
