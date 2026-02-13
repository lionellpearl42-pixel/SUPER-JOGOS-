require("dotenv").config();
const TelegramBot = require("node-telegram-bot-api");
const { initDB, getUser, updateUser } = require("./database");
const { playRoulette } = require("./games/roulette");
const { spin } = require("./games/slots");
const { playBlackjack } = require("./games/blackjack");
const { duel } = require("./games/duel");
const { canBet } = require("./antiSpam");
const { addTournamentPoints, leaderboard } = require("./tournament");

const bot = new TelegramBot(process.env.TELEGRAM_TOKEN, { polling: true });
initDB();

// Função para mostrar menu
async function showMenu(chatId, userId) {
  const user = await getUser(userId);

  const menuText = `
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
          { text: "⚔️ Duel", callback_data: "duel_menu" }
        ],
        [
          { text: "🏆 Ranking", callback_data: "ranking" }
        ]
      ]
    },
    parse_mode: "Markdown"
  };

  bot.sendMessage(chatId, menuText, options);
}

// /start ou /menu
bot.onText(/\/start|\/menu/, async (msg) => {
  await showMenu(msg.chat.id, msg.from.id);
});

// 🔹 Callback para todos os botões
bot.on("callback_query", async (query) => {
  const chatId = query.message.chat.id;
  const userId = query.from.id;
  const user = await getUser(userId);

  switch (query.data) {

    // 🎰 Slot
    case "slot":
      if (!canBet(user)) return bot.answerCallbackQuery(query.id, { text: "⏳ Aguarde 5s." });
      const slotResult = spin();
      const slotBet = 10;
      user.coins -= slotBet;
      if (slotResult.payout > 0) user.coins += slotResult.payout;
      user.last_bet = Date.now();
      await updateUser(userId, user);
      bot.sendMessage(chatId, `🎰 Slot: ${slotResult.combo}\n💰 Saldo: ${user.coins}`);
      break;

    // 🎯 Roleta
    case "roleta":
      if (!canBet(user)) return bot.answerCallbackQuery(query.id, { text: "⏳ Aguarde 5s." });
      const colors = ["vermelho", "preto", "verde"];
      const chosenColor = colors[Math.floor(Math.random() * colors.length)];
      const roulette = playRoulette(10, chosenColor);
      user.coins -= 10;
      if (roulette.payout > 0) user.coins += roulette.payout;
      user.last_bet = Date.now();
      await updateUser(userId, user);
      bot.sendMessage(chatId, `🎯 Roleta: cor sorteada: ${roulette.result}\n💰 Saldo: ${user.coins}`);
      break;

    // 🃏 Blackjack
    case "blackjack":
      if (!canBet(user)) return bot.answerCallbackQuery(query.id, { text: "⏳ Aguarde 5s." });
      const bjResult = playBlackjack(10);
      user.coins -= 10;
      if (bjResult.payout > 0) user.coins += bjResult.payout;
      user.last_bet = Date.now();
      await updateUser(userId, user);
      bot.sendMessage(chatId, `🃏 Blackjack: Player ${bjResult.player} vs Dealer ${bjResult.dealer}\n💰 Saldo: ${user.coins}`);
      break;

    // ⚔️ Duel - submenu
    case "duel_menu":
      const onlineUsers = [123456789, 987654321]; // Exemplo: IDs de jogadores online
      const duelButtons = onlineUsers
        .filter(id => id !== userId)
        .map(id => [{ text: `Desafiar ${id}`, callback_data: `duel_${id}` }]);

      bot.sendMessage(chatId, "⚔️ Escolha um oponente:", {
        reply_markup: { inline_keyboard: duelButtons }
      });
      break;

    // ⚔️ Duel - jogar
    default:
      if (query.data.startsWith("duel_")) {
        const opponentId = parseInt(query.data.split("_")[1]);
        const result = duel(userId, opponentId);
        let text;
        if (result.winner === userId) text = `🏆 Você venceu o duelo contra ${opponentId}!`;
        else if (result.winner === opponentId) text = `💀 Você perdeu para ${opponentId}!`;
        else text = "🤝 Empate no duelo!";
        bot.sendMessage(chatId, text);
      }
      break;

    // 🏆 Ranking
    case "ranking":
      const top = await leaderboard();
      let msg = "🏆 *Ranking do Torneio*\n\n";
      top.forEach((p, i) => {
        msg += `${i + 1}. ID: ${p.telegram_id} - ${p.tournament_points} pts\n`;
      });
      bot.sendMessage(chatId, msg, { parse_mode: "Markdown" });
      break;
  }

  bot.answerCallbackQuery(query.id);
});
