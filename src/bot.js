require("dotenv").config();
const TelegramBot = require("node-telegram-bot-api");
const sqlite3 = require("sqlite3").verbose();

const bot = new TelegramBot(process.env.TELEGRAM_TOKEN, { polling: true });

/* ================= DATABASE ================= */

const db = new sqlite3.Database("./casino.db");

db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY,
      coins INTEGER DEFAULT 1000
    )
  `);
});

function getUser(id) {
  return new Promise((resolve) => {
    db.get("SELECT * FROM users WHERE id = ?", [id], (err, row) => {
      if (!row) {
        db.run("INSERT INTO users (id, coins) VALUES (?, 1000)", [id]);
        return resolve({ id, coins: 1000 });
      }
      resolve(row);
    });
  });
}

function updateCoins(id, coins) {
  return new Promise((resolve) => {
    db.run("UPDATE users SET coins = ? WHERE id = ?", [coins, id], resolve);
  });
}

/* ================= GAMES ================= */

function spinSlot() {
  const symbols = ["🍒","🍋","🍊","💎","7️⃣"];
  const result = [
    symbols[Math.floor(Math.random()*symbols.length)],
    symbols[Math.floor(Math.random()*symbols.length)],
    symbols[Math.floor(Math.random()*symbols.length)]
  ];

  let payout = 0;
  if (result[0] === result[1] && result[1] === result[2]) {
    payout = result[0] === "7️⃣" ? 200 : 50;
  }

  return { combo: result.join(" | "), payout };
}

function spinRoulette() {
  const colors = ["🔴 Vermelho","⚫ Preto","🟢 Verde"];
  const result = colors[Math.floor(Math.random()*colors.length)];
  const payout = result === "🟢 Verde" ? 140 : 20;
  return { result, payout };
}

function playBlackjack() {
  const cards = ["A♠","K♠","Q♠","J♠","10♠","9♠","8♠"];

  const player = [
    cards[Math.floor(Math.random()*cards.length)],
    cards[Math.floor(Math.random()*cards.length)]
  ];

  const dealer = [
    cards[Math.floor(Math.random()*cards.length)],
    cards[Math.floor(Math.random()*cards.length)]
  ];

  const payout = Math.random() > 0.5 ? 30 : 0;

  return { player, dealer, payout };
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/* ================= MENU ================= */

async function showMenu(chatId, userId) {
  const user = await getUser(userId);

  return bot.sendMessage(chatId,
`🎰 *CASSINO ROYAL*

💰 Saldo: *${user.coins} coins*

Escolha seu jogo:`,
{
  parse_mode: "Markdown",
  reply_markup: {
    inline_keyboard: [
      [{ text: "🎰 Slot", callback_data: "slot" }],
      [{ text: "🎡 Roleta", callback_data: "roulette" }],
      [{ text: "🃏 Blackjack", callback_data: "blackjack" }]
    ]
  }
});
}

bot.onText(/\/start/, async (msg) => {
  await showMenu(msg.chat.id, msg.from.id);
});

/* ================= GAME HANDLER ================= */

const BET = 10;

bot.on("callback_query", async (query) => {

  const chatId = query.message.chat.id;
  const userId = query.from.id;
  const data = query.data;

  const user = await getUser(userId);

  if (user.coins < BET) {
    await bot.answerCallbackQuery(query.id, { text: "Saldo insuficiente!" });
    return;
  }

  if (data === "slot") {

    user.coins -= BET;
    await updateCoins(userId, user.coins);

    const anim = await bot.sendAnimation(
      chatId,
      "https://media.giphy.com/media/l3q2K5jinAlChoCLS/giphy.gif",
      { caption: "🎰 Girando..." }
    );

    await sleep(2500);

    const result = spinSlot();
    user.coins += result.payout;
    await updateCoins(userId, user.coins);

    await bot.editMessageCaption(
`🎰 SLOT

${result.combo}

💰 Ganhou: ${result.payout}
💎 Saldo: ${user.coins}`,
{
  chat_id: chatId,
  message_id: anim.message_id,
  reply_markup: {
    inline_keyboard: [
      [{ text: "🔁 Jogar novamente", callback_data: "slot" }],
      [{ text: "🏠 Menu", callback_data: "menu" }]
    ]
  }
});

  }

  if (data === "roulette") {

    user.coins -= BET;
    await updateCoins(userId, user.coins);

    const msg = await bot.sendVideo(
      chatId,
      "https://samplelib.com/lib/preview/mp4/sample-5s.mp4",
      { caption: "🎡 Girando..." }
    );

    await sleep(3000);

    const result = spinRoulette();
    user.coins += result.payout;
    await updateCoins(userId, user.coins);

    await bot.editMessageCaption(
`🎡 ROLETA

Resultado: ${result.result}

💰 Ganhou: ${result.payout}
💎 Saldo: ${user.coins}`,
{
  chat_id: chatId,
  message_id: msg.message_id,
  reply_markup: {
    inline_keyboard: [
      [{ text: "🔁 Girar novamente", callback_data: "roulette" }],
      [{ text: "🏠 Menu", callback_data: "menu" }]
    ]
  }
});

  }

  if (data === "blackjack") {

    user.coins -= BET;
    await updateCoins(userId, user.coins);

    const game = playBlackjack();
    user.coins += game.payout;
    await updateCoins(userId, user.coins);

    await bot.sendMessage(chatId,
`🃏 BLACKJACK

Você: ${game.player.join(" | ")}
Dealer: ${game.dealer.join(" | ")}

💰 Ganhou: ${game.payout}
💎 Saldo: ${user.coins}`,
{
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
