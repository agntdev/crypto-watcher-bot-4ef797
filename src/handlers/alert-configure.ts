import { Composer } from "grammy";
import type { Ctx } from "../bot.js";
import { inlineButton, inlineKeyboard } from "../toolkit/index.js";
import { getCryptoStorage } from "../storage.js";

const composer = new Composer<Ctx>();

composer.callbackQuery(/^alert:start:(.+)$/, async (ctx) => {
  await ctx.answerCallbackQuery();
  const ticker = ctx.match?.[1];
  if (!ticker) return;

  const keyboard = inlineKeyboard([
    [inlineButton("📈 Price goes above", `alert:dir:above:${ticker}`)],
    [inlineButton("📉 Price goes below", `alert:dir:below:${ticker}`)],
    [inlineButton("📊 Percent change", `alert:type:percent:${ticker}`)],
    [inlineButton("⬅️ Back to menu", "menu:main")],
  ]);

  await ctx.editMessageText(
    `Set an alert for ${ticker.toUpperCase()}.\n\nWhat kind of alert do you want?`,
    { reply_markup: keyboard }
  );
});

composer.callbackQuery(/^alert:dir:(above|below):(.+)$/, async (ctx) => {
  await ctx.answerCallbackQuery();
  const direction = ctx.match?.[1] as "above" | "below";
  const ticker = ctx.match?.[2];
  if (!direction || !ticker) return;

  ctx.session.flow = `alert:awaiting_price:${direction}:${ticker}`;
  const dirText = direction === "above" ? "above" : "below";
  await ctx.editMessageText(
    `Enter the price threshold for ${ticker.toUpperCase()} (in USD).\n\nAlert when price goes ${dirText} this value.`,
    {
      reply_markup: inlineKeyboard([[inlineButton("❌ Cancel", "menu:main")]]),
    }
  );
});

composer.callbackQuery(/^alert:type:percent:(.+)$/, async (ctx) => {
  await ctx.answerCallbackQuery();
  const ticker = ctx.match?.[1];
  if (!ticker) return;

  const keyboard = inlineKeyboard([
    [inlineButton("📈 Increases by %", `alert:pdir:above:${ticker}`)],
    [inlineButton("📉 Decreases by %", `alert:pdir:below:${ticker}`)],
    [inlineButton("⬅️ Back to menu", "menu:main")],
  ]);

  await ctx.editMessageText(
    `For ${ticker.toUpperCase()} percent change alert, which direction?`,
    { reply_markup: keyboard }
  );
});

composer.callbackQuery(/^alert:pdir:(above|below):(.+)$/, async (ctx) => {
  await ctx.answerCallbackQuery();
  const direction = ctx.match?.[1] as "above" | "below";
  const ticker = ctx.match?.[2];
  if (!direction || !ticker) return;

  ctx.session.flow = `alert:awaiting_percent:${direction}:${ticker}`;
  const dirText = direction === "above" ? "increases" : "decreases";
  await ctx.editMessageText(
    `Enter the percent threshold for ${ticker.toUpperCase()}.\n\nAlert when price ${dirText} by this percent.`,
    {
      reply_markup: inlineKeyboard([[inlineButton("❌ Cancel", "menu:main")]]),
    }
  );
});

// Handle numeric input for price/percent thresholds
composer.on("message:text", async (ctx, next) => {
  const flow = ctx.session.flow;
  if (!flow || !flow.startsWith("alert:awaiting_")) {
    await next();
    return;
  }

  const text = ctx.message.text.trim();
  const value = parseFloat(text);
  if (isNaN(value) || value <= 0) {
    await ctx.reply("Please enter a valid positive number.", {
      reply_markup: inlineKeyboard([[inlineButton("❌ Cancel", "menu:main")]]),
    });
    return;
  }

  const userId = ctx.from?.id;
  if (!userId) return;

  const storage = getCryptoStorage();
  const parts = flow.split(":");
  const alertType = parts[2]; // "price" or "percent"
  const direction = parts[1] as "above" | "below";
  const ticker = parts[3];

  if (alertType === "price") {
    const watchlist = await storage.getWatchlist(userId);
    const entry = watchlist.find((w) => w.ticker.toUpperCase() === ticker.toUpperCase());
    if (entry) {
      entry.alertRules.push({ type: "threshold", direction, value });
      await storage.addToWatchlist(entry);
    }
  } else if (alertType === "percent") {
    const watchlist = await storage.getWatchlist(userId);
    const entry = watchlist.find((w) => w.ticker.toUpperCase() === ticker.toUpperCase());
    if (entry) {
      entry.alertRules.push({ type: "percent", direction, value, window: 60 });
      await storage.addToWatchlist(entry);
    }
  }

  ctx.session.flow = undefined;

  await ctx.reply(
    `✅ Alert set for ${ticker.toUpperCase()}!\n\n` +
      `${alertType === "price" ? "Price" : "Percent change"} ${direction === "above" ? "above" : "below"} ${alertType === "price" ? `$${value}` : `${value}%`}`,
    {
      reply_markup: inlineKeyboard([
        [inlineButton("➕ Add another alert", `alert:start:${ticker}`)],
        [inlineButton("⬅️ Back to menu", "menu:main")],
      ]),
    }
  );
});

export default composer;
