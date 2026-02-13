require("dotenv").config();
const TelegramBot = require("node-telegram-bot-api");
const {
  initDB,
  getUser,
  updateUser
} = require("./database");

const {
  spin
} = require("./games/slots");
const {
  playRoulette
} = require("./games/roulette");
const {
  playBlackjack
} = require("./games/blackjack");
const {
  duel
} = require("./games/duel");

// Estado de cada jogador
const playerState = {}; // { userId: { currentGame, lastResult } }

const bot = new TelegramBot(process.env.TELEGRAM_TOKEN, {
  polling: true
});
initDB();

// Função para mostrar menu principal
async function showMenu(chatId, userId) {
  const user = await getUser(userId);

  const text = `
🎮 *Casino AI Arena*

💰 Saldo: ${user.coins} coins

🎲 Jogos:
`;

  const options = {
    reply_markup: {
      inline_keyboard: [
        [
          { text: "🎰 Slot", callback_data: "game_slot" },
          { text: "🎯 Roleta", callback_data: "game_roulette" }
        ],
        [
          { text: "🃏 Blackjack", callback_data: "game_blackjack" },
          { text: "⚔️ Duel", callback_data: "game_duel" }
        ],
        [
          { text: "🏆 Ranking", callback_data: "ranking" }
        ]
      ]
    },
    parse_mode: "Markdown"
  };

  bot.sendMessage(chatId, text, options);
}

// /start ou /menu
bot.onText(/\/start|\/menu/, async (msg) => {
  await showMenu(msg.chat.id, msg.from.id);
});

// Função para mostrar layout de jogo com botões “Jogar de novo”, “Mudar de jogo”, “Voltar ao menu”
async function showGameLayout(chatId, userId, gameName, resultText) {
  const user = await getUser(userId);

  const text = `
🎲 *${gameName}*

💰 Saldo: ${user.coins} coins

${resultText || ""}
`;

  const options = {
    reply_markup: {
      inline_keyboard: [
        [
          { text: "▶️ Jogar de novo", callback_data: `play_${gameName.toLowerCase()}` }
        ],
        [
          { text: "🔄 Mudar de jogo", callback_data: "menu_games" },
          { text: "🏠 Voltar ao menu", callback_data: "menu_main" }
        ]
      ]
    },
    parse_mode: "Markdown"
  };

  bot.sendMessage(chatId, text, options);
}

// Callback query para todos os botões
bot.on("callback_query", async (query) => {
  const chatId = query.message.chat.id;
  const userId = query.from.id;

  // Inicializa estado se não existir
  if (!playerState[userId]) playerState[userId] = { currentGame: null };

  // ---------- Menu de jogos ----------
  switch (query.data) {

    case "menu_main":
      return showMenu(chatId, userId);

    case "menu_games":
      return showMenu(chatId, userId);

    // ---------- Slot ----------
    case "game_slot":
    case "play_slot": {
      const result = spin(); // função real da slot
      const user = await getUser(userId);
      const bet = 10;
      user.coins -= bet;
      if (result.payout > 0) user.coins += result.payout;
      await updateUser(userId, user);

      const resultText = `🎰 Resultado: ${result.combo}\n💸 Ganhou: ${result.payout} coins`;

      playerState[userId].currentGame = "Slot";
      return showGameLayout(chatId, userId, "Slot", resultText);
    }

    // ---------- Roleta ----------
    case "game_roulette":
    case "play_roulette": {
      const colors = ["🔴 Vermelho", "⚫ Preto", "🟢 Verde"];
      const chosen = colors[Math.floor(Math.random() * colors.length)];
      const user = await getUser(userId);
      const bet = 10;
      user.coins -= bet;
      const payout = (chosen === "🟢 Verde") ? 140 : 20; // exemplo de payout
      user.coins += payout;
      await updateUser(userId, user);

      const resultText = `🎯 Cor sorteada: ${chosen}\n💸 Ganhou: ${payout} coins`;
      playerState[userId].currentGame = "Roleta";
      return showGameLayout(chatId, userId, "Roleta", resultText);
    }

    // ---------- Blackjack ----------
    case "game_blackjack":
    case "play_blackjack": {
      const result = playBlackjack(10);
      const user = await getUser(userId);
      const bet = 10;
      user.coins -= bet;
      if (result.payout > 0) user.coins += result.payout;
      await updateUser(userId, user);

      const resultText = `🃏 Player: ${result.player} vs Dealer: ${result.dealer}\n💸 Ganhou: ${result.payout} coins`;
      playerState[userId].currentGame = "Blackjack";
      return showGameLayout(chatId, userId, "Blackjack", resultText);
    }

    // ---------- Duel ----------
    case "game_duel":
      // Exemplo simplificado: mostra jogadores online
      const onlinePlayers = [123456789, 987654321].filter(id => id !== userId);
      const duelButtons = onlinePlayers.map(id => [{ text: `Desafiar ${id}`, callback_data: `duel_${id}` }]);
      return bot.sendMessage(chatId, "⚔️ Escolha um oponente:", { reply_markup: { inline_keyboard: duelButtons } });

    default:
      // Duel jogando
      if (query.data.startsWith("duel_")) {
        const opponentId = parseInt(query.data.split("_")[1]);
        const result = duel(userId, opponentId);
        let text;
        if (result.winner === userId) text = `🏆 Você venceu o duelo contra ${opponentId}!`;
        else if (result.winner === opponentId) text = `💀 Você perdeu para ${opponentId}!`;
        else text = "🤝 Empate no duelo!";

        return showGameLayout(chatId, userId, "Duel", text);
      }

      break;
  }

  bot.answerCallbackQuery(query.id);
});
