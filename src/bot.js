require("dotenv").config();
const TelegramBot = require("node-telegram-bot-api");
const { getUser, updateCoins } = require("./database");
const { spinSlot } = require("./games/slot");
const { spinRoulette } = require("./games/roulette");
const { playBlackjack } = require("./games/blackjack");

const bot = new TelegramBot(process.env.TELEGRAM_TOKEN, { polling: true });

const BET = 10;

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function showMenu(chatId, userId) {
  const user = await getUser(userId);

  return bot.sendMessage(chatId,
`🎰 *CASSINO ROYAL TELEGRAM*

💰 Saldo: *${user.coins} coins*

Escolha seu jogo:`,
{
  parse_mode: "Markdown",
  reply_markup: {
    inline_keyboard: [
      [{ text: "🎰 Slot Machine", callback_data: "slot" }],
      [{ text: "🎡 Roleta Europeia", callback_data: "roulette" }],
      [{ text: "🃏 Blackjack 21", callback_data: "blackjack" }]
    ]
  }
});
}

bot.onText(/\/start/, async (msg) => {
  await showMenu(msg.chat.id, msg.from.id);
});

bot.on("callback_query", async (query) => {

  const chatId = query.message.chat.id;
  const userId = query.from.id;
  const data = query.data;

  const user = await getUser(userId);

  if (user.coins < BET) {
    await bot.answerCallbackQuery(query.id, { text: "Saldo insuficiente!" });
    return;
  }

  // ================= SLOT =================
  if (data === "slot") {

    user.coins -= BET;
    await updateCoins(userId, user.coins);

    const anim = await bot.sendAnimation(
      chatId,
      "https://media.giphy.com/media/l3q2K5jinAlChoCLS/giphy.gif",
      { caption: "🎰 Girando Slot..." }
    );

    await sleep(2500);

    const result = spinSlot();
    user.coins += result.payout;
    await updateCoins(userId, user.coins);

    await bot.editMessageCaption(
`🎰 *SLOT MACHINE*

${result.combo}

💰 Ganhou: *${result.payout}*
💎 Saldo: *${user.coins}*`,
{
  chat_id: chatId,
  message_id: anim.message_id,
  parse_mode: "Markdown",
  reply_markup: {
    inline_keyboard: [
      [{ text: "🔁 Jogar novamente", callback_data: "slot" }],
      [{ text: "🏠 Menu", callback_data: "menu" }]
    ]
  }
});

  }

  // ================= ROLETA =================
  if (data === "roulette") {

    user.coins -= BET;
    await updateCoins(userId, user.coins);

    const video = await bot.sendVideo(
      chatId,
      "https://samplelib.com/lib/preview/mp4/sample-5s.mp4",
      { caption: "🎡 Girando Roleta..." }
    );

    await sleep(3000);

    const result = spinRoulette();
    user.coins += result.payout;
    await updateCoins(userId, user.coins);

    await bot.editMessageCaption(
`🎡 *ROLETA EUROPEIA*

Resultado: ${result.result}

💰 Ganhou: *${result.payout}*
💎 Saldo: *${user.coins}*`,
{
  chat_id: chatId,
  message_id: video.message_id,
  parse_mode: "Markdown",
  reply_markup: {
    inline_keyboard: [
      [{ text: "🔁 Girar novamente", callback_data: "roulette" }],
      [{ text: "🏠 Menu", callback_data: "menu" }]
    ]
  }
});

  }

  // ================= BLACKJACK =================
  if (data === "blackjack") {

    user.coins -= BET;
    await updateCoins(userId, user.coins);

    const game = playBlackjack();

    user.coins += game.payout;
    await updateCoins(userId, user.coins);

    await bot.sendMessage(chatId,
`🃏 *BLACKJACK 21*

Você: ${game.player.join(" | ")}
Dealer: ${game.dealer.join(" | ")}

💰 Ganhou: *${game.payout}*
💎 Saldo: *${user.coins}*`,
{
  parse_mode: "Markdown",
  reply_markup: {
    inline_keyboard: [
      [{ text: "🔁 Jogar novamente", callback_data: "blackjack" }],
      [{ text: "🏠 Menu", callback_data: "menu" }]
    ]
  }
});

  }

  if (data === "menu") {
    await showMenu(chatId, userId);
  }

  await bot.answerCallbackQuery(query.id);
});
