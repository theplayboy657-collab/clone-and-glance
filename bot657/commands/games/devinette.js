const db = require("../../lib/database");

function start(sock, msg) {
  const chatId = msg.key.remoteJid;
  const target = Math.floor(Math.random() * 100) + 1;

  db.setActiveGame(chatId, { type: "devinette", data: { target, attempts: 0 } });

  return sock.sendMessage(chatId, {
    text: "🎯 *Devinette* — J'ai choisi un nombre entre 1 et 100.\nEnvoie un nombre pour deviner (ou .quitter pour arrêter).",
  });
}

/**
 * Traite un message texte comme une tentative. Retourne true si le message a été traité.
 */
async function handleGuess(sock, msg, text, game) {
  const chatId = msg.key.remoteJid;
  const guess = parseInt(text.trim(), 10);

  if (isNaN(guess)) return false; // pas un nombre, on laisse passer

  game.data.attempts += 1;

  if (guess === game.data.target) {
    db.setActiveGame(chatId, null);
    await sock.sendMessage(chatId, {
      text: `🎉 Bravo ! C'était bien *${game.data.target}*, trouvé en ${game.data.attempts} essai(s).`,
    });
  } else if (guess < game.data.target) {
    db.setActiveGame(chatId, game);
    await sock.sendMessage(chatId, { text: "📈 Plus grand !" });
  } else {
    db.setActiveGame(chatId, game);
    await sock.sendMessage(chatId, { text: "📉 Plus petit !" });
  }

  return true;
}

module.exports = { start, handleGuess };
