#!/usr/bin/env
const path = require("path");
const fs = require("fs-extra");

const html = require("../lib/html");
const mkconfig = require("../lib/config");

const BUILD_PATH = path.join(__dirname, "..", "build");
// const STATIC_PATH = path.join(__dirname, "..", "static");

async function init() {
  const config = await mkconfig();

  console.log("Cleaning build.");
  await fs.remove(BUILD_PATH);
  await fs.ensureDir(BUILD_PATH);

  // console.log("Copying static resources.");
  // await fs.copy(STATIC_PATH, BUILD_PATH);

  console.log("Building static resources.");
  await fs.outputFile(
    path.join(BUILD_PATH, "index.html"),
    await html.index(config)
  );
  await fs.outputFile(
    path.join(BUILD_PATH, ".well-known/host-meta"),
    await hostmeta(config)
  );

  console.log("Building bot resources:");
  for (let [ name, bot ] of Object.entries(config.bots)) {
    console.log("\t", name);
    const { actor } = bot;
    const srcPath = path.join(config.BOTS_PATH, name);
    const destPath = path.join(BUILD_PATH, name);
    await fs.copy(
      path.join(srcPath, "avatar.png"),
      path.join(destPath, "avatar.png")
    );
    await fs.outputFile(
      path.join(destPath, "actor.json"),
      json(actor)
    );
    await fs.outputFile(
      path.join(destPath, "index.html"),
      await html.actor(actor)
    );
  }
}

const json = data => JSON.stringify(data, null, "  ");

const hostmeta = async ({ SITE_URL }) =>
  `<?xml version="1.0" encoding="UTF-8"?>
    <XRD xmlns="http://docs.oasis-open.org/ns/xri/xrd-1.0">
      <Link
        rel="lrdd"
        type="application/xrd+xml"
        template="${SITE_URL}/.well-known/webfinger?resource={uri}" />
    </XRD>`.trim();

init()
  .then(() => console.log("Build done."))
  .catch(console.error);
