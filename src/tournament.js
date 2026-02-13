const { getUser, updateUser } = require("./database");

async function addTournamentPoints(userId, points) {
  const user = await getUser(userId);
  user.tournament_points += points;
  await updateUser(userId, user);
}

async function leaderboard() {
  const res = await require("./database").pool.query(
    "SELECT telegram_id, tournament_points FROM users ORDER BY tournament_points DESC LIMIT 10"
  );
  return res.rows;
}

module.exports = { addTournamentPoints, leaderboard };
