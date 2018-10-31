const path = require("path");
const { loadTextLines, pick } = require("../../lib/utils");

exports.profile = {
  name: "CatFacts",
  summary: `<p>
    Cat facts delivered periodically. Sign up for cat facts!
    Follow me for automatic service! I belong to
    <a href="https://lmorchard.com">lmorchard</a>
    and you may peer at my innards,
    <a href="https://github.com/lmorchard/botpub">if you like</a>.
  </p>`.trim(),
};

let facts = [];

const pickFact = () => pick(facts);

exports.init = async () => {
  facts = await loadTextLines(path.join(__dirname, "cat-facts.txt"));
};

exports.onCreateNote = async ({ send }) => {
  return send(pickFact());
};

// TODO: Implement onPeriodic

/*
exports.onLike = async ({ send }) => {
  return send(`Oh you liked that, did you? ${await pickFact()}`);
};

exports.onBoost = async ({ send }) => {
  return send(`Thank you for the boost, ${await pickFact()}`);
};

exports.onFollow = async ({ send }) => {
  return send(`Thanks for the follow, ${await pickFact()}`);
};

exports.onUnfollow = async ({ send }) => {
  return send(`I will miss you, ${await pickFact()}`);
};
*/
