const emojis = ["🍒", "🍋", "🔔", "💎", "7️⃣"];

function spinSlot() {
  const reel = [
    emojis[Math.floor(Math.random() * emojis.length)],
    emojis[Math.floor(Math.random() * emojis.length)],
    emojis[Math.floor(Math.random() * emojis.length)]
  ];

  let payout = 0;
  if (reel[0] === reel[1] && reel[1] === reel[2]) payout = 100;
  else if (reel[0] === reel[1] || reel[1] === reel[2]) payout = 20;

  return { combo: reel.join(" | "), payout };
}

module.exports = { spinSlot };
