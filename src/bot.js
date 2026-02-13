require("dotenv").config();
const TelegramBot = require("node-telegram-bot-api");
const { initDB, getUser, updateUser } = require("./database");
const { spin } = require("./games/slots");
const { playBlackjack } = require("./games/blackjack");
const { duel } = require("./games/duel");

const bot = new TelegramBot(process.env.TELEGRAM_TOKEN, { polling: true });
initDB();

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ================= MENU =================

async function showMenu(chatId, userId) {
  const user = await getUser(userId);

  return bot.sendMessage(chatId,
`🎰 *CASINO AI ARENA*

💰 Saldo: *${user.coins} coins*

Escolha seu jogo:` ,
{
  parse_mode: "Markdown",
  reply_markup: {
    inline_keyboard: [
      [
        { text: "🎰 Slot", callback_data: "slot" },
        { text: "🎡 Roleta", callback_data: "roulette" }
      ],
      [
        { text: "🃏 Blackjack", callback_data: "blackjack" },
        { text: "⚔️ Duel", callback_data: "duel" }
      ]
    ]
  }
});
}

bot.onText(/\/start|\/menu/, async (msg) => {
  showMenu(msg.chat.id, msg.from.id);
});

// ================= SLOT PROFISSIONAL =================

async function playSlot(chatId, userId) {
  const user = await getUser(userId);
  const bet = 10;

  if (user.coins < bet)
    return bot.sendMessage(chatId, "Saldo insuficiente!");

  user.coins -= bet;
  await updateUser(userId, user);

  const symbols = ["🍒","🍋","🍊","💎","7️⃣"];

  const message = await bot.sendMessage(chatId, "🎰 Girando...");

  let reels = ["❔","❔","❔"];

  for (let i = 0; i < 15; i++) {
    reels = reels.map(() => symbols[Math.floor(Math.random()*symbols.length)]);
    await bot.editMessageText(
`🎰 *SLOT MACHINE*

[ ${reels.join(" | ")} ]`,
{
  chat_id: chatId,
  message_id: message.message_id,
  parse_mode: "Markdown"
});
    await sleep(120);
  }

  const result = spin();
  user.coins += result.payout;
  await updateUser(userId, user);

  await bot.editMessageText(
`🎰 *SLOT MACHINE*

[ ${result.combo} ]

💸 Resultado: *${result.payout} coins*`,
{
  chat_id: chatId,
  message_id: message.message_id,
  parse_mode: "Markdown"
});
}

// ================= ROLETA PROFISSIONAL =================

async function playRoulette(chatId, userId) {
  const user = await getUser(userId);
  const bet = 10;

  if (user.coins < bet)
    return bot.sendMessage(chatId, "Saldo insuficiente!");

  user.coins -= bet;
  await updateUser(userId, user);

  const colors = ["🔴","⚫","🟢"];

  const message = await bot.sendMessage(chatId, "🎡 Girando roleta...");

  let speed = 80;

  for (let i = 0; i < 20; i++) {
    const color = colors[Math.floor(Math.random()*colors.length)];

    await bot.editMessageText(
`🎡 *ROLETA*

Cor atual: ${color}`,
{
  chat_id: chatId,
  message_id: message.message_id,
  parse_mode: "Markdown"
});
    await sleep(speed);
    speed += 15; // desacelera
  }

  const finalColor = colors[Math.floor(Math.random()*colors.length)];
  const payout = finalColor === "🟢" ? 140 : 20;

  user.coins += payout;
  await updateUser(userId, user);

  await bot.editMessageText(
`🎡 *ROLETA*

🎯 Resultado: ${finalColor}

💸 Ganhou: *${payout} coins*`,
{
  chat_id: chatId,
  message_id: message.message_id,
  parse_mode: "Markdown"
});
}

// ================= BLACKJACK PROFISSIONAL =================

async function playBJ(chatId, userId) {
  const user = await getUser(userId);
  const bet = 10;

  if (user.coins < bet)
    return bot.sendMessage(chatId, "Saldo insuficiente!");

  user.coins -= bet;
  await updateUser(userId, user);

  const result = playBlackjack(bet) || {};
  const playerCards = result.playerCards || ["🂠","🂠"];
  const dealerCards = result.dealerCards || ["🂠","🂠"];
  const payout = result.payout || 0;

  const message = await bot.sendMessage(chatId, "🃏 Distribuindo cartas...");

  let playerText = "";
  for (const card of playerCards) {
    playerText += card + " ";
    await bot.editMessageText(
`🃏 *BLACKJACK*

Jogador: ${playerText}`,
{
  chat_id: chatId,
  message_id: message.message_id,
  parse_mode: "Markdown"
});
    await sleep(600);
  }

  let dealerText = "";
  for (const card of dealerCards) {
    dealerText += card + " ";
    await bot.editMessageText(
`🃏 *BLACKJACK*

Jogador: ${playerText}

Dealer: ${dealerText}`,
{
  chat_id: chatId,
  message_id: message.message_id,
  parse_mode: "Markdown"
});
    await sleep(600);
  }

  user.coins += payout;
  await updateUser(userId, user);

  await bot.editMessageText(
`🃏 *BLACKJACK*

Jogador: ${playerText}
Dealer: ${dealerText}

💸 Resultado: *${payout} coins*`,
{
  chat_id: chatId,
  message_id: message.message_id,
  parse_mode: "Markdown"
});
}

// ================= CALLBACKS =================

bot.on("callback_query", async (query) => {
  const chatId = query.message.chat.id;
  const userId = query.from.id;

  if (query.data === "slot") return playSlot(chatId, userId);
  if (query.data === "roulette") return playRoulette(chatId, userId);
  if (query.data === "blackjack") return playBJ(chatId, userId);
  if (query.data === "duel") return bot.sendMessage(chatId, "⚔️ Sistema de duelo em desenvolvimento.");

  bot.answerCallbackQuery(query.id);
});
