const { expect } = require("chai");

describe("lib/insults", () => {
  const insults = require("./insults");

  beforeEach(async () => {
    await insults.init();
  });

  describe("init", () => {
    it("exists", () => expect(insults.init).to.not.be.undefined);
    it("sets up the module", () =>
      expect(insults.shakespeare).to.be.an("array"));
  });

  describe("generate", () => {
    it("generates an insult", async () => {
      const result = await insults.generate();
      expect(result).to.be.a("string");
    });
  });

  describe("generateShakespeare", async () => {
    it("generates an insult starting with thou", async () => {
      const result = await insults.generateShakespeare();
      expect(result).to.be.a("string");
      expect(result.substr(0, 4)).to.equal("Thou");
    });
  });
});
