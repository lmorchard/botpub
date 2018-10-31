"use strict";

const AWS = require("aws-sdk");
const assign = Object.assign;
const setupConfig = require("../../lib/config");

exports.tasks = [
  "deliverToRemoteInbox",
  "receiveFromInbox",
  "updateSharedInboxes",
];

const taskHandlers = exports.tasks.reduce(
  (acc, name) => assign(acc, { [name]: require(`./${name}`) }),
  {}
);

exports.enqueue = exports.tasks.reduce(
  (acc, task) =>
    assign(acc, {
      [task]: async ({ config, body = {} }) => {
        const SQS = new AWS.SQS({ apiVersion: "2012-11-05" });
        const { QUEUE_NAME: QueueName } = config;
        const { QueueUrl } = await SQS.getQueueUrl({ QueueName }).promise();
        return SQS.sendMessage({
          QueueUrl,
          MessageBody: JSON.stringify(assign({ task }, body)),
        }).promise();
      },
    }),
  {}
);

exports.handler = async (event, context) => {
  const config = await setupConfig({ event, context });
  const { log } = config;
  for (let record of event.Records) {
    try {
      const body = JSON.parse(record.body);
      const { task } = body;
      if (task in taskHandlers) {
        await taskHandlers[task]({ record, body, context, config });
      }
    } catch (error) {
      log.error("queueDispatchFailure", { error: error.toString(), record });
    }
  }
};
