import { Composer } from "grammy";

// Delegates to the full add_coin:start implementation in coin-add.ts.
// This file keeps a LIVE registration so the handler is never an empty stub,
// but the actual logic lives in coin-add.ts to avoid duplicate handlers.
const composer = new Composer();

composer.callbackQuery("add_coin:start", async (_ctx, next) => {
  await next();
});

export default composer;
