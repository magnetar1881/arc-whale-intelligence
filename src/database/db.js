const sqlite3 = require("sqlite3").verbose();
const db = new sqlite3.Database("./data/whale.db");

// ========================
// TABLE INIT
// ========================
db.serialize(() => {

  db.run(`
    CREATE TABLE IF NOT EXISTS whales (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      txHash TEXT UNIQUE,
      wallet TEXT,
      token TEXT,
      amount REAL,
      type TEXT,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS wallets (
      wallet TEXT PRIMARY KEY,
      total_volume REAL DEFAULT 0,
      transfer_count INTEGER DEFAULT 0,
      last_seen DATETIME,
      whale_score REAL DEFAULT 0
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS tokens (
      token TEXT PRIMARY KEY,
      symbol TEXT,
      transfer_count INTEGER DEFAULT 0,
      mint_count INTEGER DEFAULT 0,
      unique_wallets INTEGER DEFAULT 0,
      trust_score REAL DEFAULT 0
    )
  `);

});

// ========================
// WHALE INSERT
// ========================
function insertWhale(data) {
  return new Promise((resolve, reject) => {
    db.run(
      `
      INSERT OR IGNORE INTO whales
      (txHash, wallet, token, amount, type)
      VALUES (?, ?, ?, ?, ?)
      `,
      [data.txHash, data.wallet, data.token, data.amount, data.type],
      function (err) {
        if (err) reject(err);
        else resolve(this?.changes);
      }
    );
  });
}

// ========================
// WALLET UPDATE
// ========================
function updateWallet(wallet, amount) {
  return new Promise((resolve, reject) => {
    db.run(
      `
      INSERT INTO wallets (wallet, total_volume, transfer_count, last_seen)
      VALUES (?, ?, 1, datetime('now'))
      ON CONFLICT(wallet) DO UPDATE SET
        total_volume = total_volume + ?,
        transfer_count = transfer_count + 1,
        last_seen = datetime('now')
      `,
      [wallet, amount, amount],
      (err) => {
        if (err) reject(err);
        else resolve();
      }
    );
  });
}

// ========================
// TOKEN UPDATE (V4)
// ========================
function updateTokenStats(token, symbol, type) {
  return new Promise((resolve, reject) => {
    db.run(
      `
      INSERT INTO tokens (token, symbol, transfer_count, mint_count, unique_wallets)
      VALUES (?, ?, 1, ?, 1)
      ON CONFLICT(token) DO UPDATE SET
        transfer_count = transfer_count + 1,
        mint_count = mint_count + ?,
        unique_wallets = unique_wallets + 1
      `,
      [
        token,
        symbol,
        type === "MINT" ? 1 : 0,
        type === "MINT" ? 1 : 0
      ],
      (err) => {
        if (err) reject(err);
        else resolve();
      }
    );
  });
}

// ========================
// TOP WHALES
// ========================
function getTopWhales(limit = 10) {
  return new Promise((resolve, reject) => {
    db.all(
      `
      SELECT wallet, total_volume, transfer_count
      FROM wallets
      ORDER BY total_volume DESC
      LIMIT ?
      `,
      [limit],
      (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      }
    );
  });
}

module.exports = {
  insertWhale,
  updateWallet,
  updateTokenStats,
  getTopWhales
};
