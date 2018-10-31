const { expect } = require("chai");
const setupConfig = require("../../lib/config");

describe("functions/queue/deliverToRemoteInbox", () => {
  const deliverToRemoteInbox = require("./deliverToRemoteInbox");
  const name = "Insultron2000";

  beforeEach(() => {
    global.resetMocks();
  });

  it("exists", () => {
    expect(deliverToRemoteInbox).to.not.be.undefined;
  });

  it("handles a queue task", async () => {
    const config = await setupConfig();

    global.mocks.fetch.onCall(0).resolves({ status: 202 });

    const inbox = `https://bar.example.com/inbox`;
    await deliverToRemoteInbox({
      config,
      body: {
        name,
        inbox,
        activity: {
          type: "Create",
        },
      },
    });

    const calls = global.mocks.fetch.args;
    expect(calls.length).to.equal(1);
    expect(calls[0][0]).to.equal(inbox);
    expect(calls[0][1].method).to.equal("POST");
    expect(JSON.parse(calls[0][1].body).type).to.equal("Create");
  });
});
