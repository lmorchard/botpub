const { expect } = require("chai");
const AWS = require("aws-sdk-mock");

describe("functions/inbox", async () => {
  const inbox = require("./inbox");
  const name = "Insultron2000";
  const pathParameters = { name };
  const publicKey = process.env.PUBLIC_KEY;
  const privateKey = process.env.PRIVATE_KEY;

  beforeEach(() => {
    global.resetMocks();
    AWS.restore();
  });

  it("exists", () => {
    expect(inbox).to.not.be.undefined;
  });

  describe("post", () => {
    const subject = inbox.post;
    it("exists", () => {
      expect(subject).to.not.be.undefined;
    });

    it("rejects a malformed body", async () => {
      const result = await subject({ pathParameters, body: "bad json" }, {});
      expect(result.statusCode).to.equal(400);
    });

    it("rejects a missing signature", async () => {
      const result = await subject(
        {
          httpMethod: "POST",
          path: "/inbox",
          pathParameters,
          headers: {},
          body: JSON.stringify({}),
        },
        {}
      );
      expect(result.statusCode).to.equal(401);
    });

    it("rejects an invalid signature", async () => {
      const result = await subject(
        {
          httpMethod: "POST",
          path: "/inbox",
          pathParameters,
          headers: {
            Host: "example.com",
            Date: new Date().toUTCString(),
            Signature: "blahblah",
          },
          body: JSON.stringify({}),
        },
        {}
      );
      expect(result.statusCode).to.equal(401);
    });

    it("enqueues receiveFromInbox on valid request", async () => {
      const { HOSTNAME, QUEUE_NAME } = process.env;

      AWS.mock("SQS", "getQueueUrl", ({ QueueName }, cb) => {
        expect(QueueName).to.equal(QUEUE_NAME);
        cb(null, { QueueUrl: `aws::${QueueName}` });
      });

      AWS.mock("SQS", "sendMessage", ({ QueueUrl, MessageBody }, cb) => {
        expect(QueueUrl).to.equal(`aws::${QUEUE_NAME}`);
        const body = JSON.parse(MessageBody);
        expect(body.task).to.equal("receiveFromInbox");
        cb(null, { MessageId: "8675309" });
      });

      const method = "POST";
      const path = "/inbox";
      const headers = {
        Host: HOSTNAME,
        Date: new Date().toUTCString(),
      };

      const keyId = `https://${HOSTNAME}/actor.json#main-key`;
      const { signRequest } = require("../lib/httpSignatures");
      const signature = signRequest({
        keyId,
        privateKey,
        method,
        path,
        headers,
      });

      global.mocks.fetch.resolves({
        json: () => ({ publicKey: { publicKeyPem: publicKey } }),
      });

      const result = await subject(
        {
          httpMethod: method,
          path,
          pathParameters,
          headers: Object.assign({ Signature: signature }, headers),
          body: JSON.stringify({}),
        },
        {}
      );

      expect(global.mocks.fetch.called).to.be.true;
      expect(global.mocks.fetch.args[0][0]).to.equal(keyId);
      expect(result.statusCode).to.equal(202);
    });
  });
});
