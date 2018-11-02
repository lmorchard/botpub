const fs = require("fs");
const glob = require("glob");
const { readTextFile } = require("../../lib/utils");
const { MarkovGeneratorWord } = require("./markovword");

async function main() {
  const markov = new MarkovGeneratorWord(1, 7);

  for (let filepath of glob.sync("*.txt", { cwd: __dirname + "/lyrics" })) {
    const lyrics = await readTextFile(__dirname + "/lyrics/" + filepath);
    lyrics
      .split(/\n/g)
      .map(line => line.trim())
      .filter(line => !!line)
      .forEach(line => markov.feed(line));
  }

  fs.writeFileSync(__dirname + "/markov.json", markov.toJSON());

  return "done";
}

main()
  .then(console.log)
  .catch(console.error);
