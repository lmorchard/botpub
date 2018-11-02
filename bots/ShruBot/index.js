const { MarkovGeneratorWord } = require("./markovword");
const { readTextFile } = require("../../lib/utils");
const {
  createNote,
  deliverActivity,
  ID_PUBLIC,
} = require("../../lib/activities");

exports.profile = {
  name: "ShruBot",
  summary: `<p>
    I am a bot who fell into a vat of lyrics from a
    Canadian rock band. I have been inspired to write!
    I belong to
    <a href="https://lmorchard.com">lmorchard</a>
    and you may peer at my innards,
    <a href="https://github.com/lmorchard/botpub">if you like</a>.
  </p>`.trim(),
};

let markov = null;

exports.init = async () => {
  markov = new MarkovGeneratorWord(1, 7);
  markov.fromJSON(await readTextFile(__dirname + "/markov.json"));
};

const generateText = () => {
  const out = [];
  const lines = Math.floor(Math.random() * 7) + 5;
  for (let i = 0; i < lines; i++) {
    out.push(markov.generate());
  }
  return "<p>" + out.join("<br>") + "</p>";
};

exports.onCreateNote = async ({ send }) => {
  return send(generateText());
};

exports.onPeriodic = async ({ config, bot }) => {
  // HACK: be lazy and skip writing 70% of the time.
  if (Math.random() < 0.7) {
    return;
  }
  return deliverActivity({
    bot,
    config,
    activity: createNote({
      baseUrl: bot.baseUrl,
      attributedTo: bot.actor.id,
      to: [ID_PUBLIC],
      content: generateText(),
    }),
  });
};
