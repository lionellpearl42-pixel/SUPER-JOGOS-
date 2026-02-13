function canBet(user) {
  const now = Date.now();
  if (now - user.last_bet < 5000) return false;
  return true;
}
module.exports = { canBet };
