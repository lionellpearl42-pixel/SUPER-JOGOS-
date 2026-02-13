const { Pool } = require("pg");

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function initDB() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      telegram_id BIGINT PRIMARY KEY,
      coins INT DEFAULT 1000,
      wins INT DEFAULT 0,
      losses INT DEFAULT 0,
      total_profit INT DEFAULT 0,
      tournament_points INT DEFAULT 0,
      last_bet BIGINT DEFAULT 0
    )
  `);
}

async function getUser(id) {
  const res = await pool.query("SELECT * FROM users WHERE telegram_id=$1", [id]);
  if (res.rows.length === 0) {
    await pool.query("INSERT INTO users (telegram_id) VALUES ($1)", [id]);
    return (await pool.query("SELECT * FROM users WHERE telegram_id=$1", [id])).rows[0];
  }
  return res.rows[0];
}

async function updateUser(id, data) {
  await pool.query(
    `UPDATE users 
     SET coins=$1, wins=$2, losses=$3, total_profit=$4, tournament_points=$5 
     WHERE telegram_id=$6`,
    [data.coins, data.wins, data.losses, data.total_profit, data.tournament_points, id]
  );
}

module.exports = { pool, initDB, getUser, updateUser };
