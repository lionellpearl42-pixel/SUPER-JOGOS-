require("dotenv").config();
const TelegramBot = require("node-telegram-bot-api");
const { getUser, updateCoins } = require("./database");
const { spinSlot } = require("./games/slot");
const { spinRoulette } = require("./games/roulette");
const { playBlackjack } = require("./games/blackjack");

const bot = new TelegramBot(process.env.TELEGRAM_TOKEN, { polling: true });

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

bot.onText(/\/start/, async (msg) => {
  const user = await getUser(msg.from.id);

  bot.sendMessage(msg.chat.id,
`🎰 CASSINO REAL TELEGRAM

💰 Saldo: ${user.coins} coins`,
{
  reply_markup: {
    inline_keyboard: [
      [{ text: "🎰 Slot", callback_data: "slot" }],
      [{ text: "🎡 Roleta", callback_data: "roulette" }],
      [{ text: "🃏 Blackjack", callback_data: "blackjack" }]
    ]
  }
});
});

bot.on("callback_query", async (query) => {
  const chatId = query.message.chat.id;
  const userId = query.from.id;
  const user = await getUser(userId);

  const bet = 10;

  if (user.coins < bet)
    return bot.sendMessage(chatId, "Saldo insuficiente.");

  user.coins -= bet;
  await updateCoins(userId, user.coins);

  // SLOT
  if (query.data === "slot") {

    const msg = await bot.sendAnimation(
      chatId,
      "https://media.giphy.com/media/l3q2K5jinAlChoCLS/giphy.gif",
      { caption: "🎰 Girando Slot..." }
    );

    await sleep(2500);

    const result = spinSlot();
    user.coins += result.payout;
    await updateCoins(userId, user.coins);

    await bot.editMessageCaption(
`🎰 SLOT RESULTADO

${result.combo}

💰 Ganhou: ${result.payout}
💎 Saldo: ${user.coins}`,
{
  chat_id: chatId,
  message_id: msg.message_id
});
  }

  // ROLETA
  if (query.data === "roulette") {

    const msg = await bot.sendVideo(
      chatId,
      "https://samplelib.com/lib/preview/mp4/sample-5s.mp4",
      { caption: "🎡 Girando Roleta..." }
    );

    await sleep(3000);

    const result = spinRoulette();
    user.coins += result.payout;
    await updateCoins(userId, user.coins);

    await bot.editMessageCaption(
`🎡 ROLETA RESULTADO

${result.result}

💰 Ganhou: ${result.payout}
💎 Saldo: ${user.coins}`,
{
  chat_id: chatId,
  message_id: msg.message_id
});
  }

  // BLACKJACK
  if (query.data === "blackjack") {

    const game = playBlackjack();
    user.coins += game.payout;
    await updateCoins(userId, user.coins);

    await bot.sendMessage(chatId,
`🃏 BLACKJACK

Você: ${game.player.join(" | ")}
Dealer: ${game.dealer.join(" | ")}

💰 Resultado: ${game.payout}
💎 Saldo: ${user.coins}`);
  }

  bot.answerCallbackQuery(query.id);
});
