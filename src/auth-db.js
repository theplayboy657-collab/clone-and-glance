// src/auth-db.js
// No persistent DB available. Use no-op wrappers so wa.js can call them.
// We rely on Baileys single-file auth for persistence (auth_info.json) in this environment.

async function ensureTable() {
  // no-op
}

async function loadAuthFromDb() {
  // No DB configured — return null to indicate fallback to file-based auth
  return null;
}

async function saveAuthToDb(authObj) {
  // No-op when no DB
  return;
}

module.exports = { loadAuthFromDb, saveAuthToDb };
