const symbols = [
  { s: "🍒", w: 0.4 },
  { s: "🍋", w: 0.3 },
  { s: "⭐", w: 0.2 },
  { s: "💎", w: 0.09 },
  { s: "👑", w: 0.01 }
];

function spin() {
  const roll = () => {
    let r = Math.random();
    let acc = 0;
    for (let sym of symbols) {
      acc += sym.w;
      if (r <= acc) return sym.s;
    }
  };

  const a = roll(), b = roll(), c = roll();
  let payout = 0;

  if (a === b && b === c) {
    if (a === "👑") payout = 100;
    else payout = 10;
  }

  return { combo: `${a} ${b} ${c}`, payout };
}

module.exports = { spin };
