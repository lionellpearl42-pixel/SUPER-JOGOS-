require("dotenv").config();
const TelegramBot = require("node-telegram-bot-api");
const { initDB, getUser, updateUser } = require("./database");
const { playRoulette } = require("./games/roulette");
const { spin } = require("./games/slots");
const { canBet } = require("./antiSpam");

const bot = new TelegramBot(process.env.TELEGRAM_TOKEN, { polling: true });

initDB();

bot.onText(/\/saldo/, async (msg) => {
  const user = await getUser(msg.from.id);
  bot.sendMessage(msg.chat.id, `💰 Saldo: ${user.coins}`);
});

bot.onText(/\/roleta (\d+) (vermelho|preto|verde)/, async (msg, match) => {
  const amount = parseInt(match[1]);
  const color = match[2];
  const user = await getUser(msg.from.id);

  if (!canBet(user)) return bot.sendMessage(msg.chat.id, "⏳ Aguarde 5s.");
  if (user.coins < amount) return bot.sendMessage(msg.chat.id, "Saldo insuficiente.");

  const game = playRoulette(amount, color);

  user.coins -= amount;
  if (game.payout > 0) {
    user.coins += game.payout;
    user.wins++;
    user.total_profit += game.payout - amount;
  } else {
    user.losses++;
    user.total_profit -= amount;
  }

  user.last_bet = Date.now();
  await updateUser(msg.from.id, user);

  bot.sendMessage(msg.chat.id, `🎯 Resultado: ${game.result}\n💰 Saldo: ${user.coins}`);
});
