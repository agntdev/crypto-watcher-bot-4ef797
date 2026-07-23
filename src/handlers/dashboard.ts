import { Composer } from "grammy";
import type { Ctx } from "../bot.js";
import { inlineButton, inlineKeyboard } from "../toolkit/index.js";
import { getCryptoStorage } from "../storage.js";

const composer = new Composer<Ctx>();

const OWNER_IDS = process.env.OWNER_IDS?.split(",").map(Number) ?? [];

function isOwner(userId: number): boolean {
  return OWNER_IDS.includes(userId);
}

composer.command("dashboard", async (ctx) => {
  const userId = ctx.from?.id;
  if (!userId || !isOwner(userId)) {
    await ctx.reply("⛔ This command is for the bot owner only.");
    return;
  }

  const storage = getCryptoStorage();
  const userIds = await storage.getAllUserIds();
  const totalAlerts = await storage.getTotalAlertEvents();

  await ctx.reply(
    `📊 Bot Dashboard\n\n` +
      `👥 Total users: ${userIds.length}\n` +
      `🔔 Total alerts triggered: ${totalAlerts}`,
    {
      reply_markup: inlineKeyboard([
        [inlineButton("🔄 Refresh", "dashboard:refresh")],
      ]),
    }
  );
});

composer.callbackQuery("dashboard:refresh", async (ctx) => {
  await ctx.answerCallbackQuery();
  const userId = ctx.from?.id;
  if (!userId || !isOwner(userId)) {
    await ctx.answerCallbackQuery({ text: "⛔ Owner only", show_alert: true });
    return;
  }

  const storage = getCryptoStorage();
  const userIds = await storage.getAllUserIds();
  const totalAlerts = await storage.getTotalAlertEvents();

  await ctx.editMessageText(
    `📊 Bot Dashboard\n\n` +
      `👥 Total users: ${userIds.length}\n` +
      `🔔 Total alerts triggered: ${totalAlerts}`,
    {
      reply_markup: inlineKeyboard([
        [inlineButton("🔄 Refresh", "dashboard:refresh")],
      ]),
    }
  );
});

composer.command("refresh_data", async (ctx) => {
  const userId = ctx.from?.id;
  if (!userId || !isOwner(userId)) {
    await ctx.reply("⛔ This command is for the bot owner only.");
    return;
  }

  const storage = getCryptoStorage();
  const userIds = await storage.getAllUserIds();
  const totalAlerts = await storage.getTotalAlertEvents();

  await ctx.reply(
    `🔄 Data refreshed!\n\n` +
      `👥 Total users: ${userIds.length}\n` +
      `🔔 Total alerts triggered: ${totalAlerts}`
  );
});

export default composer;
