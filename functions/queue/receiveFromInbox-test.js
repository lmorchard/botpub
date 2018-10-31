const { expect } = require("chai");
const AWS = require("aws-sdk-mock");
const setupConfig = require("../../lib/config");

describe("functions/queue/receiveFromInbox", () => {
  const receiveFromInbox = require("./receiveFromInbox");
  const name = "Insultron2000";

  beforeEach(() => {
    global.resetMocks();
  });

  it("exists", () => {
    expect(receiveFromInbox).to.not.be.undefined;
  });

  it("handles a Delete activity without a response", async () => {
    const config = await setupConfig();
    const actor = "https://foo.example.com/actor";
    const result = await receiveFromInbox({
      config,
      body: {
        name,
        activity: {
          type: "Delete",
          actor,
          object: actor,
        },
      },
    });
    expect(result.result).to.equal("delete");
  });

  it("handles a Create Note with a response", async () => {
    const config = await setupConfig();
    const actor = "https://foo.example.com/actor";

    global.mocks.fetch.onCall(0).resolves({
      json: () => {
        return {
          type: "Person",
          username: "foobar",
          preferredUsername: "foobar",
          url: "https://bar.example.com/@foobar",
          inbox: "https://bar.example.com/actor",
          followers: "https://bar.example.com/followers",
        };
      },
    });

    const s3PutMock = AWS.mock("S3", "putObject", (params, cb) =>
      cb(null, { result: "ok" })
    );

    const s3DeleteMock = AWS.mock("S3", "deleteObject", (params, cb) =>
      cb(null, "parp")
    );

    const s3GetMock = AWS.mock("S3", "getObject", (params, cb) =>
      cb(null, {
        Body: JSON.stringify([
          "https://baz.example.com/sharedInbox1",
          "https://baz.example.com/sharedInbox2",
        ]),
      })
    );

    const sqsGetQueueUrlMock = AWS.mock(
      "SQS",
      "getQueueUrl",
      ({ QueueName }, cb) => cb(null, { QueueUrl: `aws::${QueueName}` })
    );

    // HACK: Since SQS is instantiated wth each enqueue call, the mock gets reset.
    const sendMessageCalls = [];
    AWS.mock("SQS", "sendMessage", (params, cb) => {
      sendMessageCalls.push(params);
      cb(null, { MessageId: "8675309" });
    });

    await receiveFromInbox({
      config,
      body: {
        name,
        activity: {
          type: "Create",
          actor,
          object: {
            type: "Note",
          },
        },
      },
    });

    expect(global.mocks.fetch.callCount).to.equal(1);
    expect(s3PutMock.stub.callCount).to.equal(4);
    expect(s3DeleteMock.stub.callCount).to.equal(0);
    expect(s3GetMock.stub.callCount).to.equal(0);
    expect(sqsGetQueueUrlMock.stub.callCount).to.equal(1);
    expect(sendMessageCalls.length).to.equal(3);

    for (let [{ Key }] of s3PutMock.stub.args) {
      expect(Key.startsWith(name)).to.be.true;
    }

    /*
    const putKeys = s3PutMock.stub.args.map(([{ Key }]) => Key);
    console.log("PUTS", putKeys);
    console.log("SENDS", sendMessageCalls);
    */
  });
});
