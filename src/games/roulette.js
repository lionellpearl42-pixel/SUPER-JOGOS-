function playRoulette(amount, color) {
  const rand = Math.random();
  let result;

  if (rand < 0.49) result = "vermelho";
  else if (rand < 0.98) result = "preto";
  else result = "verde";

  let payout = 0;

  if (result === color) {
    payout = color === "verde" ? amount * 14 : amount * 2;
  }

  return { result, payout };
}

module.exports = { playRoulette };
