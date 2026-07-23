import { Composer } from "grammy";
import type { Ctx } from "../bot.js";
import { mainMenuKeyboard, registerMainMenuItem } from "../toolkit/index.js";

// Register main menu items for all features
registerMainMenuItem({ label: "📈 Price", data: "price:check", order: 10 });
registerMainMenuItem({ label: "➕ Add Coin", data: "add_coin:start", order: 20 });
registerMainMenuItem({ label: "📋 Watchlist", data: "watchlist:view", order: 30 });
registerMainMenuItem({ label: "⚙️ Settings", data: "settings:show", order: 40 });

// The /start handler renders the bot's MAIN MENU — the primary way users operate
// a button-first bot. A feature adds its own button by calling
// `registerMainMenuItem(...)` in its own `src/handlers/<slug>.ts`; this handler
// renders whatever is registered (plus a Help button), so you do NOT edit this
// file to add a feature. Send ONE message — no placeholder line above the menu.
const composer = new Composer<Ctx>();

const WELCOME = "👋 Welcome to Crypto Watcher! Track prices, set alerts, and get morning summaries.\n\nTap a button below to get started.";

composer.command("start", async (ctx) => {
  await ctx.reply(WELCOME, { reply_markup: mainMenuKeyboard() });
});

// "Back to menu" — re-render the main menu in place from any sub-view.
composer.callbackQuery("menu:main", async (ctx) => {
  await ctx.answerCallbackQuery();
  await ctx.editMessageText(WELCOME, { reply_markup: mainMenuKeyboard() });
});

export default composer;
