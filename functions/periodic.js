"use strict";

const setupConfig = require("../lib/config");

module.exports.handler = async (event = {}, context = {}) => {
  const config = await setupConfig({ event, context });
  const { log, bots } = config;

  for (let bot of Object.values(bots)) {
    if (bot.onPeriodic) {
      await bot.init();
      await bot.onPeriodic({ config, bot });
    }
  }

  log.info("periodicDone");
};
