const { expect } = require("chai");

describe("lib/compliments", () => {
  const compliments = require("./compliments");

  beforeEach(async () => {
    await compliments.init();
  });

  describe("init", () => {
    it("exists", () => expect(compliments.init).to.not.be.undefined);
    it("sets up the module", () =>
      expect(compliments.shakespeare).to.be.an("array"));
  });

  describe("generate", () => {
    it("generates a compliment", async () => {
      const result = await compliments.generate();
      expect(result).to.be.a("string");
    });
  });

  describe("generateShakespeare", async () => {
    it("generates a compliment starting with thou", async () => {
      const result = await compliments.generateShakespeare();
      expect(result).to.be.a("string");
      expect(result.substr(0, 4)).to.equal("Thou");
    });
  });
});

