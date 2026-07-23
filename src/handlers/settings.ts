import { Composer } from "grammy";
import type { Ctx } from "../bot.js";
import { inlineButton, inlineKeyboard } from "../toolkit/index.js";
import { getCryptoStorage } from "../storage.js";

const composer = new Composer<Ctx>();

const TIMEZONES = [
  { label: "UTC", value: "UTC" },
  { label: "EST (UTC-5)", value: "America/New_York" },
  { label: "CST (UTC-6)", value: "America/Chicago" },
  { label: "MST (UTC-7)", value: "America/Denver" },
  { label: "PST (UTC-8)", value: "America/Los_Angeles" },
  { label: "GMT (UTC+0)", value: "Europe/London" },
  { label: "CET (UTC+1)", value: "Europe/Berlin" },
  { label: "JST (UTC+9)", value: "Asia/Tokyo" },
  { label: "AEST (UTC+10)", value: "Australia/Sydney" },
];

composer.callbackQuery("settings:show", async (ctx) => {
  await ctx.answerCallbackQuery();
  const userId = ctx.from?.id;
  if (!userId) return;

  const storage = getCryptoStorage();
  const settings = await storage.getUserSettings(userId);

  const tz = settings.timezone ?? "UTC";
  const quietStart = settings.quietHoursStart ?? 22;
  const quietEnd = settings.quietHoursEnd ?? 7;
  const summaryTime = settings.morningSummaryTime ?? "08:00";
  const cooldown = settings.cooldownLength ?? 60;

  await ctx.editMessageText(
    `⚙️ Your settings:\n\n` +
      `🌍 Timezone: ${tz}\n` +
      `🔇 Quiet hours: ${quietStart}:00 – ${quietEnd}:00\n` +
      `🌅 Morning summary: ${summaryTime}\n` +
      `⏱ Cooldown: ${cooldown} minutes`,
    {
      reply_markup: inlineKeyboard([
        [inlineButton("🌍 Timezone", "settings:tz")],
        [inlineButton("🔇 Quiet Hours", "settings:quiet")],
        [inlineButton("🌅 Summary Time", "settings:summary")],
        [inlineButton("⏱ Cooldown", "settings:cooldown")],
        [inlineButton("⬅️ Back to menu", "menu:main")],
      ]),
    }
  );
});

composer.callbackQuery("settings:tz", async (ctx) => {
  await ctx.answerCallbackQuery();
  const keyboard = inlineKeyboard([
    TIMEZONES.map((tz) => inlineButton(tz.label, `settings:tz:${tz.value}`)),
    [inlineButton("⬅️ Back", "settings:show")],
  ]);
  await ctx.editMessageText("Select your timezone:", { reply_markup: keyboard });
});

composer.callbackQuery(/^settings:tz:(.+)$/, async (ctx) => {
  await ctx.answerCallbackQuery();
  const tz = ctx.match?.[1];
  if (!tz) return;

  const userId = ctx.from?.id;
  if (!userId) return;

  const storage = getCryptoStorage();
  const settings = await storage.getUserSettings(userId);
  settings.timezone = tz;
  await storage.setUserSettings(settings);

  await ctx.editMessageText(`✅ Timezone set to ${tz}`, {
    reply_markup: inlineKeyboard([[inlineButton("⬅️ Back to settings", "settings:show")]]),
  });
});

composer.callbackQuery("settings:quiet", async (ctx) => {
  await ctx.answerCallbackQuery();
  const keyboard = inlineKeyboard([
    [inlineButton("22:00 – 07:00", "settings:quiet:22:7")],
    [inlineButton("23:00 – 08:00", "settings:quiet:23:8")],
    [inlineButton("00:00 – 06:00", "settings:quiet:0:6")],
    [inlineButton("Disable", "settings:quiet:off")],
    [inlineButton("⬅️ Back", "settings:show")],
  ]);
  await ctx.editMessageText("When should alerts be quiet?", { reply_markup: keyboard });
});

composer.callbackQuery(/^settings:quiet:(\d+):(\d+)$/, async (ctx) => {
  await ctx.answerCallbackQuery();
  const start = parseInt(ctx.match?.[1] ?? "22", 10);
  const end = parseInt(ctx.match?.[2] ?? "7", 10);

  const userId = ctx.from?.id;
  if (!userId) return;

  const storage = getCryptoStorage();
  const settings = await storage.getUserSettings(userId);
  settings.quietHoursStart = start;
  settings.quietHoursEnd = end;
  await storage.setUserSettings(settings);

  await ctx.editMessageText(`✅ Quiet hours set to ${start}:00 – ${end}:00`, {
    reply_markup: inlineKeyboard([[inlineButton("⬅️ Back to settings", "settings:show")]]),
  });
});

composer.callbackQuery("settings:quiet:off", async (ctx) => {
  await ctx.answerCallbackQuery();
  const userId = ctx.from?.id;
  if (!userId) return;

  const storage = getCryptoStorage();
  const settings = await storage.getUserSettings(userId);
  settings.quietHoursStart = undefined;
  settings.quietHoursEnd = undefined;
  await storage.setUserSettings(settings);

  await ctx.editMessageText("✅ Quiet hours disabled", {
    reply_markup: inlineKeyboard([[inlineButton("⬅️ Back to settings", "settings:show")]]),
  });
});

composer.callbackQuery("settings:summary", async (ctx) => {
  await ctx.answerCallbackQuery();
  ctx.session.flow = "settings:awaiting_summary_time";
  await ctx.editMessageText(
    "Enter the time for your morning summary (e.g., 08:00, 07:30).",
    {
      reply_markup: inlineKeyboard([[inlineButton("❌ Cancel", "settings:show")]]),
    }
  );
});

composer.callbackQuery("settings:cooldown", async (ctx) => {
  await ctx.answerCallbackQuery();
  const keyboard = inlineKeyboard([
    [inlineButton("30 min", "settings:cooldown:30")],
    [inlineButton("1 hour", "settings:cooldown:60")],
    [inlineButton("2 hours", "settings:cooldown:120")],
    [inlineButton("4 hours", "settings:cooldown:240")],
    [inlineButton("⬅️ Back", "settings:show")],
  ]);
  await ctx.editMessageText("How long between alerts for the same coin?", {
    reply_markup: keyboard,
  });
});

composer.callbackQuery(/^settings:cooldown:(\d+)$/, async (ctx) => {
  await ctx.answerCallbackQuery();
  const minutes = parseInt(ctx.match?.[1] ?? "60", 10);

  const userId = ctx.from?.id;
  if (!userId) return;

  const storage = getCryptoStorage();
  const settings = await storage.getUserSettings(userId);
  settings.cooldownLength = minutes;
  await storage.setUserSettings(settings);

  await ctx.editMessageText(`✅ Cooldown set to ${minutes} minutes`, {
    reply_markup: inlineKeyboard([[inlineButton("⬅️ Back to settings", "settings:show")]]),
  });
});

// Handle text input for summary time
composer.on("message:text", async (ctx, next) => {
  if (ctx.session.flow !== "settings:awaiting_summary_time") {
    await next();
    return;
  }

  const text = ctx.message.text.trim();
  const timeRegex = /^([01]?\d|2[0-3]):([0-5]\d)$/;
  if (!timeRegex.test(text)) {
    await ctx.reply("Please enter a valid time in HH:MM format (e.g., 08:00).", {
      reply_markup: inlineKeyboard([[inlineButton("❌ Cancel", "settings:show")]]),
    });
    return;
  }

  const userId = ctx.from?.id;
  if (!userId) return;

  const storage = getCryptoStorage();
  const settings = await storage.getUserSettings(userId);
  settings.morningSummaryTime = text;
  await storage.setUserSettings(settings);

  ctx.session.flow = undefined;
  await ctx.reply(`✅ Morning summary set for ${text}`, {
    reply_markup: inlineKeyboard([[inlineButton("⬅️ Back to settings", "settings:show")]]),
  });
});

export default composer;
