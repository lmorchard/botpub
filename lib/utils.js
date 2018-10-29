const fs = require("fs");
const path = require("path");
const util = require("util");

exports.dateNow = () => new Date().toISOString();

// This is a terrible ID generator with a Y2198 problem, but at least it sorts
// in reverse-chronological order in an S3 bucket!
exports.uid = () =>
  [
    (Number.MAX_SAFE_INTEGER - Date.now())
      .toString()
      .substr(3)
      .padStart(13, "0"),
    "-",
    ("" + Math.floor(Math.random() * 10000)).padStart(4, "0"),
  ].join("");

exports.readFile = util.promisify(fs.readFile);

exports.localPath = name => path.join(__dirname, "..", name);

exports.readTextFile = async name =>
  exports.readFile(name, { encoding: "utf8" });

exports.pick = arr => arr[Math.floor(Math.random() * arr.length)];

// eslint-disable-next-line no-nested-ternary
exports.asc = (a, b) => (a < b ? -1 : b < a ? 1 : 0);

exports.loadTextLines = async name =>
  (await exports.readTextFile(name))
    .split(/\n/)
    .map(line => line.trim())
    .filter(line => !!line)
    .filter(line => line.substr(0, 1) !== "#");

exports.withContext = data =>
  Object.assign(
    {
      "@context": [
        "https://www.w3.org/ns/activitystreams",
        "https://w3id.org/security/v1",
      ],
    },
    data
  );
