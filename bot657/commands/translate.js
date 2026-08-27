const db = require("../lib/database");
const config = require("../config");

/**
 * .translate on/off — réservé au owner (les traductions arrivent en DM sur son numéro,
 * donc seul lui doit pouvoir activer/désactiver cette fonction).
 * Une fois actif : dans TOUTES les discussions/groupes où le owner échange,
 * tout message reçu qui n'est pas en français est automatiquement traduit
 * et envoyé en privé au owner (personne d'autre ne voit rien).
 */
async function handleTranslateCommand(sock, msg, argText, senderNumber) {
  const chatId = msg.key.remoteJid;

  if (senderNumber !== config.OWNER_NUMBER) {
    await sock.sendMessage(chatId, { text: "⚠️ Seul le owner peut activer/désactiver la traduction." });
    return;
  }

  if (argText === "on") {
    db.setTranslateMode(true);
    await sock.sendMessage(chatId, {
      text: "🌍 Traduction automatique activée. Je te traduirai en privé tout message reçu qui n'est pas en français, peu importe la discussion.",
    });
  } else if (argText === "off") {
    db.setTranslateMode(false);
    await sock.sendMessage(chatId, { text: "🌍 Traduction automatique désactivée." });
  } else {
    await sock.sendMessage(chatId, { text: "Usage : .translate on | .translate off" });
  }
}

module.exports = { handleTranslateCommand };
