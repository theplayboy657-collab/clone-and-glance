const db = require("../../lib/database");
const devinette = require("./devinette");
const roleplay = require("./roleplay");
const config = require("../../config");

function getGamesMenuText() {
  return `╭─❒ *JEUX* ❒
│ 1️⃣ Devinette — ${config.PREFIX}jeu devinette
│ 2️⃣ Jeu de rôle — ${config.PREFIX}jeu rp {personnage}
│
│ ${config.PREFIX}quitter — arrête le jeu en cours
╰────────────────`;
}

/**
 * .jeu {nom} {arguments}
 */
async function startGame(sock, msg, gameName, argText) {
  const chatId = msg.key.remoteJid;

  switch (gameName) {
    case "devinette":
      await devinette.start(sock, msg);
      break;
    case "rp":
      await roleplay.start(sock, msg, argText);
      break;
    default:
      await sock.sendMessage(chatId, {
        text: `⚠️ Jeu inconnu. Tape ${config.PREFIX}jeux pour voir la liste.`,
      });
  }
}

async function quitGame(sock, msg) {
  const chatId = msg.key.remoteJid;
  const game = db.getActiveGame(chatId);
  if (!game) {
    await sock.sendMessage(chatId, { text: "Aucun jeu en cours." });
    return;
  }
  db.setActiveGame(chatId, null);
  await sock.sendMessage(chatId, { text: "🛑 Jeu arrêté." });
}

/**
 * Route un message texte (sans préfixe) vers le jeu actif si il y en a un.
 * Retourne true si le message a été géré par un jeu.
 */
async function routeToActiveGame(sock, msg, text) {
  const chatId = msg.key.remoteJid;
  const game = db.getActiveGame(chatId);
  if (!game) return false;

  if (game.type === "devinette") {
    return devinette.handleGuess(sock, msg, text, game);
  }
  if (game.type === "rp") {
    return roleplay.handleMessage(sock, msg, text, game);
  }
  return false;
}

module.exports = { getGamesMenuText, startGame, quitGame, routeToActiveGame };
