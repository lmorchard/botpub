const path = require("path");
const glob = require("glob");
const log = require("./log");
const { readTextFile } = require("./utils");
const assign = Object.assign;

const {
  LOG_LEVEL = "debug",
  HOSTNAME = "botpub.lmorchard.com",
  QUEUE_NAME,
  STATIC_BUCKET,
} = process.env;

const BOTS_PATH = path.join(__dirname, "..", "bots");

module.exports = async (params = {}) => {
  const { event = {}, context = {}, meta = {} } = params;

  const bots = {};
  for (let indexPath of glob.sync("*/index.js", { cwd: BOTS_PATH })) {
    const modulePath = path.join(BOTS_PATH, path.dirname(indexPath));
    const bot = require(modulePath);
    const key = name => readTextFile(path.join(modulePath, `${name}.pem`));
    bots[bot.profile.name] = assign(
      {
        privateKeyPem: await key("private"),
        publicKeyPem: await key("public"),
      },
      bot,
    );
  }

  const SITE_URL = `https://${HOSTNAME}`;
  return {
    log: log({ event, context, meta, LOG_LEVEL }),
    bots,
    LOG_LEVEL,
    HOSTNAME,
    QUEUE_NAME,
    STATIC_BUCKET,
    SITE_URL,
    BOTS_PATH,
  };
};
