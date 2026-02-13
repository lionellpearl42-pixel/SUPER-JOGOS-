function drawCard() {
  const cards = [2, 3, 4, 5, 6, 7, 8, 9, 10, 10, 10, 10, 11];
  return cards[Math.floor(Math.random() * cards.length)];
}

function playBlackjack(bet) {
  let player = drawCard() + drawCard();
  let dealer = drawCard() + drawCard();

  while (dealer < 17) dealer += drawCard();

  let payout = 0;
  if ((player > dealer && player <= 21) || dealer > 21) payout = bet * 2;

  return { player, dealer, payout };
}

module.exports = { playBlackjack };
