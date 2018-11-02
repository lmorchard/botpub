const path = require("path");
const glob = require("glob");
const log = require("./log");
const { withContext, readTextFile } = require("./utils");
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
  const SITE_URL = `https://${HOSTNAME}`;
  return {
    log: log({ event, context, meta, LOG_LEVEL }),
    bots: await loadBots({ SITE_URL }),
    LOG_LEVEL,
    HOSTNAME,
    QUEUE_NAME,
    STATIC_BUCKET,
    SITE_URL,
    BOTS_PATH,
  };
};

async function loadBots({ SITE_URL }) {
  const bots = {};
  for (let indexPath of glob.sync("*/index.js", { cwd: BOTS_PATH })) {
    const modulePath = path.join(BOTS_PATH, path.dirname(indexPath));
    const bot = require(modulePath);
    const {
      profile: { name, summary },
    } = bot;
    const baseUrl = `${SITE_URL}/${name}`;
    const key = name => readTextFile(path.join(modulePath, `${name}.pem`));
    const actor = withContext({
      type: "Service",
      id: `${baseUrl}/actor.json`,
      url: `${baseUrl}/`,
      name,
      summary,
      preferredUsername: name,
      inbox: `${SITE_URL}/inbox/${name}`,
      outbox: `${SITE_URL}/outbox/${name}`,
      endpoints: {
        sharedInbox: `${SITE_URL}/inbox/`,
      },
      icon: {
        type: "Image",
        mediaType: "image/png",
        url: `${SITE_URL}/${name}/avatar.png`,
      },
      publicKey: {
        id: `${baseUrl}/actor.json#main-key`,
        owner: `${baseUrl}/actor.json`,
        publicKeyPem: await key("public"),
      },
    });
    bots[name] = assign(
      {
        baseUrl,
        privateKeyPem: await key("private"),
        actor,
      },
      bot
    );
  }
  return bots;
}
