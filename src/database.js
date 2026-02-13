const sqlite3 = require("sqlite3").verbose();
const db = new sqlite3.Database("./casino.db");

db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY,
    coins INTEGER DEFAULT 100
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    game TEXT,
    bet INTEGER,
    result INTEGER,
    date TEXT
  )`);
});

function getUser(id) {
  return new Promise((resolve) => {
    db.get("SELECT * FROM users WHERE id=?", [id], (err, row) => {
      if (!row) {
        db.run("INSERT INTO users (id, coins) VALUES (?, ?)", [id, 100]);
        resolve({ id, coins: 100 });
      } else resolve(row);
    });
  });
}

function updateCoins(id, coins) {
  return new Promise((resolve, reject) => {
    db.run("UPDATE users SET coins=? WHERE id=?", [coins, id], function(err) {
      if (err) reject(err); else resolve();
    });
  });
}

function addHistory(user_id, game, bet, result) {
  const date = new Date().toISOString();
  db.run("INSERT INTO history (user_id, game, bet, result, date) VALUES (?, ?, ?, ?, ?)",
    [user_id, game, bet, result, date]);
}

function getHistory(user_id) {
  return new Promise((resolve, reject) => {
    db.all("SELECT * FROM history WHERE user_id=? ORDER BY id DESC LIMIT 10", [user_id],
      (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
  });
}

module.exports = { getUser, updateCoins, addHistory, getHistory };
