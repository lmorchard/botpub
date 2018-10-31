const path = require("path");
const { loadTextLines, pick } = require("../../lib/utils");

exports.init = async () => {
  exports.shakespeare = await exports.initShakespeare();
  return true;
};

exports.generate = async () => {
  return exports.generateShakespeare();
};

exports.initShakespeare = async () =>
  (await loadTextLines(path.join(__dirname, "shakespeare.txt")))
    .map(line => line.split(/\s+/))
    .reduce(
      ([col1, col2, col3], [i1, i2, i3]) => [
        i1 ? [...col1, i1] : col1,
        i2 ? [...col2, i2] : col2,
        i3 ? [...col3, i3] : col3,
      ],
      [[], [], []]
    );

exports.generateShakespeare = async () =>
  [
    "Thou",
    pick(exports.shakespeare[0]),
    pick(exports.shakespeare[1]),
    pick(exports.shakespeare[2]),
  ].join(" ");
