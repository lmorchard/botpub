const { expect } = require("chai");

describe("functions/webfinger", async () => {
  const webfinger = require("./webfinger");

  it("exists", () => {
    expect(webfinger).to.not.be.undefined;
  });

  describe("get", () => {
    const subject = webfinger.get;

    it("doesn't throw an error when queryStringParameters is null", async () => {
      await subject({ queryStringParameters: null });
    });
  });
});
