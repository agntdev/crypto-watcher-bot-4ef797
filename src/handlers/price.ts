import { Composer } from "grammy";
import type { Ctx } from "../bot.js";
import { inlineButton, inlineKeyboard } from "../toolkit/index.js";
import { getCryptoStorage } from "../storage.js";
import { getPrices, formatPrice, formatPercentChange } from "../price-api.js";

const composer = new Composer<Ctx>();

composer.callbackQuery("price:check", async (ctx) => {
  await ctx.answerCallbackQuery();
  const userId = ctx.from?.id;
  if (!userId) return;

  const storage = getCryptoStorage();
  const watchlist = await storage.getWatchlist(userId);

  if (watchlist.length === 0) {
    await ctx.editMessageText(
      "Your watchlist is empty.\n\nAdd some coins first, then check their prices.",
      {
        reply_markup: inlineKeyboard([
          [inlineButton("➕ Add Coin", "add_coin:start")],
          [inlineButton("⬅️ Back to menu", "menu:main")],
        ]),
      }
    );
    return;
  }

  const tickers = watchlist.map((w) => w.ticker);
  const prices = await getPrices(tickers);

  if (prices.length === 0) {
    await ctx.editMessageText(
      "Couldn't fetch prices right now. Try again in a moment.",
      {
        reply_markup: inlineKeyboard([[inlineButton("⬅️ Back to menu", "menu:main")]]),
      }
    );
    return;
  }

  const lines = prices.map(
    (p) => `${p.displayName} (${p.ticker}): ${formatPrice(p.priceUsd)} ${formatPercentChange(p.percentChange24h)}`
  );

  await ctx.editMessageText(
    `📊 Your watchlist prices:\n\n${lines.join("\n")}`,
    {
      reply_markup: inlineKeyboard([
        [inlineButton("🔄 Refresh", "price:check")],
        [inlineButton("⬅️ Back to menu", "menu:main")],
      ]),
    }
  );
});

composer.command("price", async (ctx) => {
  const userId = ctx.from?.id;
  if (!userId) return;

  const storage = getCryptoStorage();
  const watchlist = await storage.getWatchlist(userId);

  if (watchlist.length === 0) {
    await ctx.reply(
      "Your watchlist is empty.\n\nAdd some coins first, then check their prices.",
      {
        reply_markup: inlineKeyboard([
          [inlineButton("➕ Add Coin", "add_coin:start")],
        ]),
      }
    );
    return;
  }

  const tickers = watchlist.map((w) => w.ticker);
  const prices = await getPrices(tickers);

  if (prices.length === 0) {
    await ctx.reply("Couldn't fetch prices right now. Try again in a moment.");
    return;
  }

  const lines = prices.map(
    (p) => `${p.displayName} (${p.ticker}): ${formatPrice(p.priceUsd)} ${formatPercentChange(p.percentChange24h)}`
  );

  await ctx.reply(
    `📊 Your watchlist prices:\n\n${lines.join("\n")}`,
    {
      reply_markup: inlineKeyboard([
        [inlineButton("🔄 Refresh", "price:check")],
      ]),
    }
  );
});

export default composer;
