const { expect } = require("chai");

describe("functions/periodic", () => {
  const periodic = require("./periodic");

  beforeEach(() => {
    global.resetMocks();
  });

  it("exists", () => {
    expect(periodic).to.not.be.undefined;
  });

  describe("handler", () => {
    it("exists", () => {
      expect(periodic.handler).to.not.be.undefined;
    });

    // TODO: find a consistent way to run this test with a non-random bot
    /*
    const AWS = require("aws-sdk-mock");
    it("calls onPeriodic in bots", async () => {
      const actor = {
        id: "https://bar.example.com/foobar.json",
        type: "Person",
        username: "foobar",
        preferredUsername: "foobar",
        url: "https://bar.example.com/@foobar",
        inbox: "https://bar.example.com/actor",
        followers: "https://bar.example.com/followers",
      };
      global.mocks.fetch.onCall(0).resolves({ json: () => actor });

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

      await periodic.handler();

      expect(global.mocks.fetch.callCount).to.equal(0);
      expect(s3PutMock.stub.callCount).to.equal(4);
      expect(s3DeleteMock.stub.callCount).to.equal(0);
      expect(s3GetMock.stub.callCount).to.equal(0);
      expect(sqsGetQueueUrlMock.stub.callCount).to.equal(1);
      expect(sendMessageCalls.length).to.equal(2);

      const putKeys = s3PutMock.stub.args.map(([{ Key }]) => Key);
      console.log("PUTS", putKeys);
      const putBodies = s3PutMock.stub.args
        .filter(([{ Key }]) => Key.endsWith(".json"))
        .map(([{ Body }]) => JSON.parse(Body));
      console.log("BODIES", putBodies);
      console.log("SENDS", sendMessageCalls);
    });
    */
  });
});
