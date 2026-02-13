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

const bot = new TelegramBot(process.env.TELEGRAM_TOKEN, { polling: true });
initDB();

// Função para mostrar menu principal
async function showMenu(chatId, userId) {
  const user = await getUser(userId);

  const text = `
🎮 *Casino AI Arena*

💰 Saldo: ${user.coins} coins

🎲 Escolha um jogo:
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

// /start -> Menu
bot.onText(/\/start|\/menu/, async (msg) => {
  await showMenu(msg.chat.id, msg.from.id);
});

// Função de delay
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Função para enviar cartas uma a uma
async function sendCards(chatId, cards, caption) {
  let text = caption + "\n";
  for (const card of cards) {
    text += card + " ";
    await bot.sendMessage(chatId, text, { parse_mode: "Markdown" });
    await sleep(500);
  }
}

bot.on("callback_query", async (query) => {
  const chatId = query.message.chat.id;
  const userId = query.from.id;

  switch (query.data) {
    case "menu_main":
    case "menu_games":
      return showMenu(chatId, userId);

    // 🎰 SLOT animado
    case "game_slot":
    case "play_slot": {
      const user = await getUser(userId);
      const bet = 10;
      if (user.coins < bet) return bot.answerCallbackQuery(query.id, { text: "Saldo insuficiente!" });

      user.coins -= bet;
      await updateUser(userId, user);

      const slotGIFs = [
        "https://media.giphy.com/media/3o6ZsXcK7Wlptjv8Xu/giphy.gif",
        "https://media.giphy.com/media/l41lI4bYmcsPJX9Go/giphy.gif"
      ];

      // Mostra GIF de giro
      await bot.sendAnimation(chatId, slotGIFs[Math.floor(Math.random() * slotGIFs.length)], {
        caption: "🎰 Girando os slots...", parse_mode: "Markdown"
      });

      await sleep(2000);

      const result = spin();
      user.coins += result.payout;
      await updateUser(userId, user);

      bot.sendMessage(chatId, `🎰 *Resultado:* ${result.combo}\n💸 *Ganhou:* ${result.payout} coins`, { parse_mode: "Markdown" });

      return;
    }

    // 🎡 ROLETTE animada
    case "game_roulette":
    case "play_roulette": {
      const user = await getUser(userId);
      const bet = 10;
      if (user.coins < bet) return bot.answerCallbackQuery(query.id, { text: "Saldo insuficiente!" });

      user.coins -= bet;
      await updateUser(userId, user);

      const colors = ["🔴 Vermelho", "⚫ Preto", "🟢 Verde"];
      const chosen = colors[Math.floor(Math.random() * colors.length)];

      // Animação de cores piscando
      for (let i = 0; i < 6; i++) {
        const flash = colors[Math.floor(Math.random() * colors.length)];
        await bot.sendMessage(chatId, `🎡 Girando... ${flash}`, { parse_mode: "Markdown" });
        await sleep(500);
      }

      const payout = (chosen === "🟢 Verde") ? 140 : 20;
      user.coins += payout;
      await updateUser(userId, user);

      bot.sendMessage(chatId, `🎯 *Cor sorteada:* ${chosen}\n💸 *Ganhou:* ${payout} coins`, { parse_mode: "Markdown" });

      return;
    }

    // 🃏 BLACKJACK animado
    case "game_blackjack":
    case "play_blackjack": {
      const user = await getUser(userId);
      const bet = 10;
      if (user.coins < bet) return bot.answerCallbackQuery(query.id, { text: "Saldo insuficiente!" });

      user.coins -= bet;
      await updateUser(userId, user);

      const result = playBlackjack(bet) || {};
      const playerCards = result.playerCards || ["🂠","🂠"];
      const dealerCards = result.dealerCards || ["🂠","🂠"];
      const payout = result.payout || 0;

      // Mostra cartas do player uma a uma
      await sendCards(chatId, playerCards, "🃏 Suas cartas:");

      // Mostra cartas do dealer uma a uma
      await sendCards(chatId, dealerCards, "🂠 Dealer:");

      user.coins += payout;
      await updateUser(userId, user);

      bot.sendMessage(chatId, `💸 *Ganhou:* ${payout} coins`, { parse_mode: "Markdown" });

      return;
    }

    // DUEL simplificado
    case "game_duel":
      const onlinePlayers = [123456789, 987654321].filter(id => id !== userId);
      const duelButtons = onlinePlayers.map(id => [{ text: `Desafiar ${id}`, callback_data: `duel_${id}` }]);
      return bot.sendMessage(chatId, "⚔️ Escolha um oponente:", { reply_markup: { inline_keyboard: duelButtons } });

    default:
      if (query.data.startsWith("duel_")) {
        const opponentId = parseInt(query.data.split("_")[1]);
        const result = duel(userId, opponentId);
        let text;
        if (result.winner === userId) text = `🏆 Você venceu o duelo!`;
        else if (result.winner === opponentId) text = `💀 Você perdeu!`;
        else text = "🤝 Empate!";
        return bot.sendMessage(chatId, text);
      }
      break;
  }

  bot.answerCallbackQuery(query.id);
});
