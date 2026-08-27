const fs = require("fs");
const path = require("path");
const config = require("../config");

const DB_PATH = path.resolve(__dirname, "..", config.DB_FILE.replace("./lib/", ""));

function loadDB() {
  if (!fs.existsSync(DB_PATH)) {
    const initial = {
      authorizedUsers: [],
      groupSettings: {},
      userState: {},
      chatMode: {}, // { [chatId]: true/false }
      memory: {}, // { [chatId]: [{role, content}, ...] }
      activeGames: {}, // { [chatId]: { type, data } }
      settings: { translateActive: false },
    };
    fs.writeFileSync(DB_PATH, JSON.stringify(initial, null, 2));
    return initial;
  }
  try {
    const data = JSON.parse(fs.readFileSync(DB_PATH, "utf-8"));
    // rétrocompatibilité si le fichier existait avant l'étape 2
    data.chatMode = data.chatMode || {};
    data.memory = data.memory || {};
    data.activeGames = data.activeGames || {};
    data.settings = data.settings || { translateActive: false };
    return data;
  } catch (e) {
    return {
      authorizedUsers: [],
      groupSettings: {},
      userState: {},
      chatMode: {},
      memory: {},
      activeGames: {},
      settings: { translateActive: false },
    };
  }
}

function saveDB(db) {
  fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2));
}

// --- Utilisateurs autorisés ---
function isAuthorized(number) {
  const db = loadDB();
  return (
    number === config.OWNER_NUMBER ||
    db.authorizedUsers.includes(number)
  );
}

function addAuthorized(number) {
  const db = loadDB();
  if (!db.authorizedUsers.includes(number)) {
    db.authorizedUsers.push(number);
    saveDB(db);
  }
  return true;
}

function removeAuthorized(number) {
  const db = loadDB();
  db.authorizedUsers = db.authorizedUsers.filter((n) => n !== number);
  saveDB(db);
  return true;
}

// --- Statut utilisateur (ex: "en réunion", "à l'école") ---
function setUserState(number, state) {
  const db = loadDB();
  db.userState[number] = state; // null pour effacer
  saveDB(db);
}

function getUserState(number) {
  const db = loadDB();
  return db.userState[number] || null;
}

// --- Paramètres de groupe (ex: mode chat actif, traduction active) ---
function setGroupSetting(groupId, key, value) {
  const db = loadDB();
  if (!db.groupSettings[groupId]) db.groupSettings[groupId] = {};
  db.groupSettings[groupId][key] = value;
  saveDB(db);
}

function getGroupSetting(groupId, key) {
  const db = loadDB();
  return db.groupSettings[groupId]?.[key];
}

// --- Mode .chat (IA) ---
function setChatMode(chatId, active) {
  const db = loadDB();
  db.chatMode[chatId] = active;
  saveDB(db);
}

function isChatModeActive(chatId) {
  const db = loadDB();
  return !!db.chatMode[chatId];
}

// --- Mémoire persistante (historique de conversation par discussion) ---
function getMemory(chatId) {
  const db = loadDB();
  return db.memory[chatId] || [];
}

function pushMemory(chatId, role, content) {
  const db = loadDB();
  if (!db.memory[chatId]) db.memory[chatId] = [];
  db.memory[chatId].push({ role, content });
  // on garde un historique borné pour ne pas gonfler le fichier indéfiniment
  const max = require("../config").AI_MAX_HISTORY * 2;
  if (db.memory[chatId].length > max) {
    db.memory[chatId] = db.memory[chatId].slice(-max);
  }
  saveDB(db);
}

function clearMemory(chatId) {
  const db = loadDB();
  db.memory[chatId] = [];
  saveDB(db);
}

// --- Jeux actifs ---
function setActiveGame(chatId, game) {
  const db = loadDB();
  if (game === null) {
    delete db.activeGames[chatId];
  } else {
    db.activeGames[chatId] = game;
  }
  saveDB(db);
}

function getActiveGame(chatId) {
  const db = loadDB();
  return db.activeGames[chatId] || null;
}

// --- Traduction automatique globale ---
function setTranslateMode(active) {
  const db = loadDB();
  db.settings.translateActive = active;
  saveDB(db);
}

function isTranslateModeActive() {
  const db = loadDB();
  return !!db.settings.translateActive;
}

module.exports = {
  loadDB,
  saveDB,
  isAuthorized,
  addAuthorized,
  removeAuthorized,
  setUserState,
  getUserState,
  setGroupSetting,
  getGroupSetting,
  setChatMode,
  isChatModeActive,
  getMemory,
  pushMemory,
  clearMemory,
  setActiveGame,
  getActiveGame,
  setTranslateMode,
  isTranslateModeActive,
};
