import { Composer } from "grammy";
import type { Ctx } from "../bot.js";
import { inlineButton, inlineKeyboard } from "../toolkit/index.js";
import { getCryptoStorage } from "../storage.js";
import { searchCoin, getPrice, formatPrice } from "../price-api.js";

const composer = new Composer<Ctx>();

const COMMON_TICKERS = [
  { ticker: "BTC", label: "BTC" },
  { ticker: "ETH", label: "ETH" },
  { ticker: "SOL", label: "SOL" },
  { ticker: "XRP", label: "XRP" },
  { ticker: "DOGE", label: "DOGE" },
];

composer.callbackQuery("add_coin:start", async (ctx) => {
  await ctx.answerCallbackQuery();
  const userId = ctx.from?.id;
  if (!userId) return;

  const keyboard = inlineKeyboard([
    COMMON_TICKERS.map((t) => inlineButton(t.label, `add_coin:select:${t.ticker}`)),
    [inlineButton("🔍 Search for another coin", "add_coin:search")],
    [inlineButton("⬅️ Back to menu", "menu:main")],
  ]);

  await ctx.editMessageText("Which coin do you want to add to your watchlist?\n\nTap one of the common coins below, or search for any other.", {
    reply_markup: keyboard,
  });
});

composer.callbackQuery("add_coin:search", async (ctx) => {
  await ctx.answerCallbackQuery();
  await ctx.editMessageText("Type the ticker or name of the coin you want to add (e.g., BTC, ETH, or Bitcoin).");
  // Set session state to await ticker input
  ctx.session.flow = "add_coin:awaiting_ticker";
});

composer.callbackQuery(/^add_coin:select:(.+)$/, async (ctx) => {
  await ctx.answerCallbackQuery();
  const ticker = ctx.match?.[1];
  if (!ticker) return;

  const userId = ctx.from?.id;
  if (!userId) return;

  const price = await getPrice(ticker);
  if (!price) {
    await ctx.editMessageText(`Couldn't find ${ticker}. Check the ticker and try again.`, {
      reply_markup: inlineKeyboard([[inlineButton("⬅️ Back to menu", "menu:main")]]),
    });
    return;
  }

  const storage = getCryptoStorage();
  const entry = {
    userId,
    ticker: price.ticker,
    displayName: price.displayName,
    alertRules: [],
  };
  await storage.addToWatchlist(entry);

  await ctx.editMessageText(
    `✅ Added ${price.displayName} (${price.ticker}) to your watchlist.\n\nCurrent price: ${formatPrice(price.priceUsd)}`,
    {
      reply_markup: inlineKeyboard([
        [inlineButton("🔔 Set Alert", `alert:start:${price.ticker}`)],
        [inlineButton("⬅️ Back to menu", "menu:main")],
      ]),
    }
  );
});

// Handle text input for ticker search
composer.on("message:text", async (ctx, next) => {
  if (ctx.session.flow !== "add_coin:awaiting_ticker") {
    await next();
    return;
  }

  const query = ctx.message.text.trim();
  if (!query) return;

  const userId = ctx.from?.id;
  if (!userId) return;

  const results = await searchCoin(query);
  if (results.length === 0) {
    await ctx.reply(`Couldn't find "${query}". Try a different ticker or name.`, {
      reply_markup: inlineKeyboard([[inlineButton("⬅️ Back to menu", "menu:main")]]),
    });
    return;
  }

  const keyboard = inlineKeyboard([
    results.map((r) => inlineButton(`${r.displayName} (${r.ticker})`, `add_coin:select:${r.ticker}`)),
    [inlineButton("⬅️ Back to menu", "menu:main")],
  ]);

  await ctx.reply("Which one did you mean?", { reply_markup: keyboard });
  ctx.session.flow = undefined;
});

export default composer;
