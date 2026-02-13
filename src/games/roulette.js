const colors = ["🔴", "⚫"];

function spinRoulette() {
  const number = Math.floor(Math.random() * 37); // 0-36
  const color = number === 0 ? "🟢" : colors[number % 2];
  return { result: `${number} ${color}`, payout: number % 2 === 0 ? 20 : 0 };
}

module.exports = { spinRoulette };
