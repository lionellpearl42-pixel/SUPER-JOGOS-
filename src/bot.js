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

// 🔹 Menu inicial
bot.onText(/\/start|\/menu/, async (msg) => {
  const chatId = msg.chat.id;
  const user = await getUser(msg.from.id);

  const menu = `
🎮 *Casino AI Arena*

💰 Saldo: ${user.coins} coins

🎲 Jogos:
`;

  const options = {
    reply_markup: {
      inline_keyboard: [
        [
          { text: "🎰 Slot", callback_data: "slot" },
          { text: "🎯 Roleta", callback_data: "roleta" }
        ],
        [
          { text: "🃏 Blackjack", callback_data: "blackjack" },
          { text: "⚔️ Duel", callback_data: "duel" }
        ],
        [
          { text: "🏆 Ranking", callback_data: "ranking" }
        ]
      ]
    },
    parse_mode: "Markdown"
  };

  bot.sendMessage(chatId, menu, options);
});

// 🔹 Resposta aos botões do menu
bot.on("callback_query", async (query) => {
  const chatId = query.message.chat.id;
  const userId = query.from.id;
  const user = await getUser(userId);

  switch (query.data) {
    case "slot":
      if (!canBet(user)) return bot.answerCallbackQuery(query.id, { text: "⏳ Aguarde 5s." });
      const slotResult = spin();
      user.coins -= 10; // aposta padrão 10
      if (slotResult.payout > 0) user.coins += slotResult.payout;
      user.last_bet = Date.now();
      await updateUser(userId, user);
      bot.sendMessage(chatId, `🎰 Resultado: ${slotResult.combo}\n💰 Saldo: ${user.coins}`);
      break;

    case "roleta":
      if (!canBet(user)) return bot.answerCallbackQuery(query.id, { text: "⏳ Aguarde 5s." });
      const colors = ["vermelho", "preto", "verde"];
      const chosenColor = colors[Math.floor(Math.random() * colors.length)];
      const roulette = playRoulette(10, chosenColor);
      user.coins -= 10;
      if (roulette.payout > 0) user.coins += roulette.payout;
      user.last_bet = Date.now();
      await updateUser(userId, user);
      bot.sendMessage(chatId, `🎯 Cor sorteada: ${roulette.result}\n💰 Saldo: ${user.coins}`);
      break;

    case "blackjack":
      if (!canBet(user)) return bot.answerCallbackQuery(query.id, { text: "⏳ Aguarde 5s." });
      const bjResult = playBlackjack(10);
      user.coins -= 10;
      if (bjResult.payout > 0) user.coins += bjResult.payout;
      user.last_bet = Date.now();
      await updateUser(userId, user);
      bot.sendMessage(chatId, `🃏 Blackjack: Player ${bjResult.player} vs Dealer ${bjResult.dealer}\n💰 Saldo: ${user.coins}`);
      break;

    case "duel":
      bot.sendMessage(chatId, "⚔️ Para duelar, envie /duel <opponent_id>");
      break;

    case "ranking":
      const top = await leaderboard();
      let msg = "🏆 *Ranking do Torneio*\n\n";
      top.forEach((p, i) => {
        msg += `${i + 1}. ID: ${p.telegram_id} - ${p.tournament_points} pts\n`;
      });
      bot.sendMessage(chatId, msg, { parse_mode: "Markdown" });
      break;

    default:
      bot.sendMessage(chatId, "Comando não reconhecido.");
  }

  bot.answerCallbackQuery(query.id);
});
