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

  if (!playerState[userId]) playerState[userId] = { currentGame: null };

  switch (query.data) {

    case "menu_main":
      return showMenu(chatId, userId);

    case "menu_games":
      return showMenu(chatId, userId);

    // ---------- Slot com animação ----------
    case "game_slot":
    case "play_slot": {
      const user = await getUser(userId);
      const bet = 10;
      if (user.coins < bet) return bot.answerCallbackQuery(query.id, { text: "Saldo insuficiente!" });

      user.coins -= bet;
      await updateUser(userId, user);

      const msg = await bot.sendMessage(chatId, `🎰 Girando...`, { parse_mode: "Markdown" });

      const reels = [
        ["🍒","🍋","🍊","7️⃣","🍀"],
        ["🍒","🍋","🍊","7️⃣","🍀"],
        ["🍒","🍋","🍊","7️⃣","🍀"]
      ];

      let finalResult = [];
      for (let i = 0; i < 10; i++) {
        setTimeout(async () => {
          const reelResult = reels.map(r => r[Math.floor(Math.random() * r.length)]);
          await bot.editMessageText(`🎰 ${reelResult.join(" | ")}`, {
            chat_id: chatId,
            message_id: msg.message_id
          });
          if (i === 9) {
            finalResult = reelResult;
            let payout = spin(finalResult).payout || 0;
            user.coins += payout;
            await updateUser(userId, user);

            await bot.editMessageText(`🎰 ${finalResult.join(" | ")}\n💸 Ganhou: ${payout} coins`, {
              chat_id: chatId,
              message_id: msg.message_id
            });
          }
        }, i * 400);
      }

      playerState[userId].currentGame = "Slot";
      return;
    }

    // ---------- Roleta animada ----------
    case "game_roulette":
    case "play_roulette": {
      const user = await getUser(userId);
      const bet = 10;
      if (user.coins < bet) return bot.answerCallbackQuery(query.id, { text: "Saldo insuficiente!" });

      user.coins -= bet;
      await updateUser(userId, user);

      const msg = await bot.sendMessage(chatId, `🎡 Girando roleta...`, { parse_mode: "Markdown" });

      const colors = ["🔴", "⚫", "🟢"];
      const spinning = Array.from({ length: 8 }, () => colors[Math.floor(Math.random() * colors.length)]);

      spinning.forEach((color, index) => {
        setTimeout(() => {
          bot.editMessageText(`🎡 Girando roleta: ${color}`, {
            chat_id: chatId,
            message_id: msg.message_id
          });
        }, index * 400);
      });

      setTimeout(async () => {
        const chosen = colors[Math.floor(Math.random() * colors.length)];
        let payout = (chosen === "🟢") ? 140 : 20;
        user.coins += payout;
        await updateUser(userId, user);

        await bot.editMessageText(`🎯 Cor sorteada: ${chosen}\n💸 Ganhou: ${payout} coins`, {
          chat_id: chatId,
          message_id: msg.message_id
        });
      }, 8 * 400);

      playerState[userId].currentGame = "Roleta";
      return;
    }

    // ---------- Blackjack com cartas seguras ----------
    case "game_blackjack":
    case "play_blackjack": {
      const user = await getUser(userId);
      const bet = 10;
      if (user.coins < bet) return bot.answerCallbackQuery(query.id, { text: "Saldo insuficiente!" });

      user.coins -= bet;

      const result = playBlackjack(bet) || {};
      const playerCards = result.playerCards || ["🂠","🂠"];
      const dealerCards = result.dealerCards || ["🂠","🂠"];
      const payout = result.payout || 0;

      user.coins += payout;
      await updateUser(userId, user);

      const resultText = `🃏 Suas cartas: ${playerCards.join(" ")}
🂠 Dealer: ${dealerCards.join(" ")}
💸 Ganhou: ${payout} coins`;

      playerState[userId].currentGame = "Blackjack";
      return showGameLayout(chatId, userId, "Blackjack", resultText);
    }

    // ---------- Duel ----------
    case "game_duel":
      const onlinePlayers = [123456789, 987654321].filter(id => id !== userId);
      const duelButtons = onlinePlayers.map(id => [{ text: `Desafiar ${id}`, callback_data: `duel_${id}` }]);
      return bot.sendMessage(chatId, "⚔️ Escolha um oponente:", { reply_markup: { inline_keyboard: duelButtons } });

    default:
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
