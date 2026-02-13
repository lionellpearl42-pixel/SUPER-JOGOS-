function duel(player1, player2) {
  const p1 = Math.random();
  const p2 = Math.random();

  if (p1 > p2) return { winner: player1 };
  else if (p2 > p1) return { winner: player2 };
  else return { winner: null };
}

module.exports = { duel };
