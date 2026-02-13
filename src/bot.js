require("dotenv").config();
const TelegramBot = require("node-telegram-bot-api");
const { getUser, updateCoins, addHistory, getHistory } = require("./database");
const { spinSlot } = require("./games/slot");
const { spinRoulette } = require("./games/roulette");
const { playBlackjack } = require("./games/blackjack");

const bot = new TelegramBot(process.env.TELEGRAM_TOKEN, { polling: true });

function formatCoins(coins) {
  return `💎 Saldo: ${coins}`;
}

bot.onText(/\/start|\/menu/, async (msg) => {
  const user = await getUser(msg.from.id);
  bot.sendMessage(msg.chat.id,
`🎰 CASSINO TOP TELEGRAM

${formatCoins(user.coins)}

Escolha um jogo:`,
  { reply_markup: { inline_keyboard: [
      [{ text: "🎰 Slot", callback_data: "slot" }],
      [{ text: "🎡 Roleta", callback_data: "roulette" }],
      [{ text: "🃏 Blackjack", callback_data: "blackjack" }],
      [{ text: "📜 Histórico", callback_data: "history" }]
  ]}});
});

bot.on("callback_query", async (query) => {
  const chatId = query.message.chat.id;
  const userId = query.from.id;
  const user = await getUser(userId);

  const bet = 10;
  if (user.coins < bet) return bot.sendMessage(chatId, "Saldo insuficiente.");

  if (query.data === "slot") {
    user.coins -= bet;
    const result = spinSlot();
    user.coins += result.payout;
    await updateCoins(userId, user.coins);
    addHistory(userId, "Slot", bet, result.payout);

    bot.sendMessage(chatId,
`🎰 SLOT

${result.combo}

💰 Ganhou: ${result.payout}
${formatCoins(user.coins)}`);
  }

  if (query.data === "roulette") {
    user.coins -= bet;
    const result = spinRoulette();
    user.coins += result.payout;
    await updateCoins(userId, user.coins);
    addHistory(userId, "Roleta", bet, result.payout);

    bot.sendMessage(chatId,
`🎡 ROLETA

${result.result}

💰 Ganhou: ${result.payout}
${formatCoins(user.coins)}`);
  }

  if (query.data === "blackjack") {
    user.coins -= bet;
    const result = playBlackjack();
    user.coins += result.payout;
    await updateCoins(userId, user.coins);
    addHistory(userId, "Blackjack", bet, result.payout);

    bot.sendMessage(chatId,
`🃏 BLACKJACK

Você: ${result.player.join(" | ")}
Dealer: ${result.dealer.join(" | ")}

💰 Resultado: ${result.payout}
${formatCoins(user.coins)}`);
  }

  if (query.data === "history") {
    const history = await getHistory(userId);
    if (history.length === 0) bot.sendMessage(chatId, "Nenhuma aposta ainda.");
    else {
      const msg = history.map(h => `${h.date.split("T")[0]} - ${h.game} - Bet:${h.bet} Resultado:${h.result}`).join("\n");
      bot.sendMessage(chatId, `📜 Últimas apostas:\n${msg}`);
    }
  }

  bot.answerCallbackQuery(query.id);
});
