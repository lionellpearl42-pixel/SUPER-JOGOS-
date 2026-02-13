function playBlackjack() {
  const cards = ["A♠","A♥","A♦","A♣","2♠","2♥","2♦","2♣","3♠","3♥","3♦","3♣","4♠","4♥","4♦","4♣","5♠","5♥","5♦","5♣","6♠","6♥","6♦","6♣","7♠","7♥","7♦","7♣","8♠","8♥","8♦","8♣","9♠","9♥","9♦","9♣","10♠","10♥","10♦","10♣","J♠","J♥","J♦","J♣","Q♠","Q♥","Q♦","Q♣","K♠","K♥","K♦","K♣"];
  
  function draw(n) {
    return Array.from({length:n},()=>cards[Math.floor(Math.random()*cards.length)]);
  }

  const player = draw(2);
  const dealer = draw(2);

  const payout = Math.random() > 0.5 ? 50 : -10; // simples
  return { player, dealer, payout };
}

module.exports = { playBlackjack };
