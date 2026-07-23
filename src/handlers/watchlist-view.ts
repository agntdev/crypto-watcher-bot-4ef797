import { Composer } from "grammy";
import type { Ctx } from "../bot.js";
import { inlineButton, inlineKeyboard } from "../toolkit/index.js";
import { getCryptoStorage } from "../storage.js";

const composer = new Composer<Ctx>();

composer.callbackQuery("watchlist:view", async (ctx) => {
  await ctx.answerCallbackQuery();
  const userId = ctx.from?.id;
  if (!userId) return;

  const storage = getCryptoStorage();
  const watchlist = await storage.getWatchlist(userId);

  if (watchlist.length === 0) {
    await ctx.editMessageText(
      "Your watchlist is empty.\n\nTap Add Coin to start tracking crypto prices.",
      {
        reply_markup: inlineKeyboard([
          [inlineButton("➕ Add Coin", "add_coin:start")],
          [inlineButton("⬅️ Back to menu", "menu:main")],
        ]),
      }
    );
    return;
  }

  const lines = watchlist.map((w, i) => {
    const alerts = w.alertRules.length > 0
      ? ` (${w.alertRules.length} alert${w.alertRules.length > 1 ? "s" : ""})`
      : "";
    return `${i + 1}. ${w.displayName} (${w.ticker})${alerts}`;
  });

  const buttons = watchlist.flatMap((w) => [
    [
      inlineButton(`🔔 ${w.ticker}`, `alert:start:${w.ticker}`),
      inlineButton(`❌ Remove`, `watchlist:remove:${w.ticker}`),
    ],
  ]);

  await ctx.editMessageText(
    `📋 Your watchlist:\n\n${lines.join("\n")}\n\nTap a coin to set alerts, or remove it.`,
    {
      reply_markup: inlineKeyboard([
        ...buttons,
        [inlineButton("➕ Add Coin", "add_coin:start")],
        [inlineButton("⬅️ Back to menu", "menu:main")],
      ]),
    }
  );
});

composer.callbackQuery(/^watchlist:remove:(.+)$/, async (ctx) => {
  await ctx.answerCallbackQuery();
  const ticker = ctx.match?.[1];
  if (!ticker) return;

  const userId = ctx.from?.id;
  if (!userId) return;

  const storage = getCryptoStorage();
  const removed = await storage.removeFromWatchlist(userId, ticker);

  if (removed) {
    await ctx.editMessageText(
      `✅ Removed ${ticker.toUpperCase()} from your watchlist.`,
      {
        reply_markup: inlineKeyboard([
          [inlineButton("📋 View Watchlist", "watchlist:view")],
          [inlineButton("⬅️ Back to menu", "menu:main")],
        ]),
      }
    );
  } else {
    await ctx.editMessageText(
      `Couldn't find ${ticker.toUpperCase()} in your watchlist.`,
      {
        reply_markup: inlineKeyboard([[inlineButton("⬅️ Back to menu", "menu:main")]]),
      }
    );
  }
});

export default composer;
