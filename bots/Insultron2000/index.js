const insults = require("./insults");

exports.profile = {
  name: "Insultron2000",
  summary: `<p>
    I am Insultron2000. I am here to serve you with insults.
    Follow me for automatic service! I belong to
    <a href="https://lmorchard.com">lmorchard</a>
    and you may peer at my innards,
    <a href="https://github.com/lmorchard/botpub">if you like</a>.
  </p>`.trim(),
};

exports.init = async () => {
  await insults.init();
};

exports.onCreateNote = async ({ send }) => {
  return send(await insults.generate());
};

exports.onLike = async ({ send }) => {
  return send(`Oh you liked that, did you? ${await insults.generate()}`);
};

exports.onBoost = async ({ send }) => {
  return send(`Thank you for the boost, ${await insults.generate()}`);
};

exports.onFollow = async ({ send }) => {
  return send(`Thanks for the follow, ${await insults.generate()}`);
};

exports.onUnfollow = async ({ send }) => {
  return send(`I will miss you, ${await insults.generate()}`);
};
