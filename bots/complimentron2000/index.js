const compliments = require("./compliments");

exports.profile = {
  name: "Complimentron2000",
  summary: `<p>
    I am Complimentron2000. I am here to serve you with compliments.
    Follow me for automatic service! I belong to
    <a href="https://lmorchard.com">lmorchard</a>
    and you may peer at my innards,
    <a href="https://github.com/lmorchard/botpub">if you like</a>.
  </p>`.trim(),
};

exports.init = async () => {
  await compliments.init();
};

exports.onCreateNote = async ({ send }) => {
  return send(await compliments.generate());
};

exports.onLike = async ({ send }) => {
  return send(`Oh you liked that, did you? ${await compliments.generate()}`);
};

exports.onBoost = async ({ send }) => {
  return send(`Thank you for the boost, ${await compliments.generate()}`);
};

exports.onFollow = async ({ send }) => {
  return send(`Thanks for the follow, ${await compliments.generate()}`);
};

exports.onUnfollow = async ({ send }) => {
  return send(`I will miss you, ${await compliments.generate()}`);
};
