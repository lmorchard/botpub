const path = require("path");
const { loadTextLines, pick } = require("../../lib/utils");
const {
  createNote,
  deliverActivity,
  ID_PUBLIC,
} = require("../../lib/activities");

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

exports.onPeriodic = async ({ config, bot }) => {
  return deliverActivity({
    bot,
    config,
    activity: createNote({
      baseUrl: bot.baseUrl,
      attributedTo: bot.actor.id,
      to: [ID_PUBLIC],
      content: pickFact(),
    }),
  });
};

exports.onLike = async ({ send }) => {
  return send(`I'm glad you liked that fact!`);
};

exports.onBoost = async ({ send }) => {
  return send(`Thank you for the boost!`);
};

exports.onFollow = async ({ send }) => {
  return send(`Thanks for the follow!`);
};
