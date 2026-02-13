require("dotenv").config();
const TelegramBot = require("node-telegram-bot-api");
const { initDB, getUser, updateUser } = require("./database");
const { playRoulette } = require("./games/roulette");
const { spin } = require("./games/slots");
const { playBlackjack } = require("./games/blackjack");
const { duel } = require("./games/duel");
const { canBet } = require("./antiSpam");
const { narrate } = require("./ai");
const { addTournamentPoints, leaderboard } = require("./tournament");

const bot = new TelegramBot(process.env.TELEGRAM_TOKEN, { polling: true });

initDB();

// SALDO
bot.onText(/\/saldo/, async (msg) => {
  const user = await getUser(msg.from.id);
  bot.sendMessage(msg.chat.id, `💰 Saldo: ${user.coins}`);
});

// ROLETE
bot.onText(/\/roleta (\d+) (vermelho|preto|verde)/, async (msg, match) => {
  const amount = parseInt(match[1]);
  const color = match[2];
  const user = await getUser(msg.from.id);

  if (!canBet(user)) return bot.sendMessage(msg.chat.id, "⏳ Aguarde 5s.");
  if (user.coins < amount) return bot.sendMessage(msg.chat.id, "Saldo insuficiente.");

  const game = playRoulette(amount, color);
  user.coins -= amount;
  if (game.payout > 0) user.coins += game.payout;
  user.last_bet = Date.now();
  await updateUser(msg.from.id, user);

  bot.sendMessage(msg.chat.id, `🎯 Resultado: ${game.result}\n💰 Saldo: ${user.coins}`);
});

// SLOT
bot.onText(/\/slot (\d+)/, async (msg, match) => {
  const amount = parseInt(match[1]);
  const user = await getUser(msg.from.id);
  if (!canBet(user)) return bot.sendMessage(msg.chat.id, "⏳ Aguarde 5s.");
  if (user.coins < amount) return bot.sendMessage(msg.chat.id, "Saldo insuficiente.");

  const result = spin();
  user.coins -= amount;
  if (result.payout > 0) user.coins += result.payout;
  user.last_bet = Date.now();
  await updateUser(msg.from.id, user);

  bot.sendMessage(msg.chat.id, `🎰 Resultado: ${result.combo}\n💰 Saldo: ${user.coins}`);
});

// BLACKJACK
bot.onText(/\/blackjack (\d+)/, async (msg, match) => {
  const bet = parseInt(match[1]);
  const user = await getUser(msg.from.id);
  if (!canBet(user)) return bot.sendMessage(msg.chat.id, "⏳ Aguarde 5s.");
  if (user.coins < bet) return bot.sendMessage(msg.chat.id, "Saldo insuficiente.");

  const result = playBlackjack(bet);
  user.coins -= bet;
  if (result.payout > 0) user.coins += result.payout;
  user.last_bet = Date.now();
  await updateUser(msg.from.id, user);

  bot.sendMessage(msg.chat.id, `🃏 Blackjack: Player ${result.player} vs Dealer ${result.dealer}\n💰 Saldo: ${user.coins}`);
});

// DUEL
bot.onText(/\/duel (\d+)/, async (msg, match) => {
  const opponentId = parseInt(match[1]);
  const player1 = msg.from.id;
  const player2 = opponentId;

  const result = duel(player1, player2);

  bot.sendMessage(msg.chat.id, result.winner ? `🏆 Vencedor: ${result.winner}` : "🤝 Empate!");
});
