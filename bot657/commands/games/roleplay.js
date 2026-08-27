const db = require("../../lib/database");
const { askAI } = require("../../lib/ai");

function start(sock, msg, character) {
  const chatId = msg.key.remoteJid;

  if (!character) {
    return sock.sendMessage(chatId, {
      text: "⚠️ Précise un personnage. Exemple : .jeu rp un détective des années 1920",
    });
  }

  db.setActiveGame(chatId, { type: "rp", data: { character } });
  db.clearMemory(chatId);

  return sock.sendMessage(chatId, {
    text: `🎭 *Jeu de rôle démarré*\nJe joue maintenant : *${character}*\nÉcris ton premier message (ou .quitter pour arrêter).`,
  });
}

async function handleMessage(sock, msg, text, game) {
  const chatId = msg.key.remoteJid;

  const systemPrompt = `Tu incarnes ce personnage dans un jeu de rôle textuel : ${game.data.character}. Reste dans le personnage à chaque réponse, sois immersif, et réponds en français.`;

  db.pushMemory(chatId, "user", text);
  const history = db.getMemory(chatId);

  const reply = await askAI(history, systemPrompt);

  db.pushMemory(chatId, "assistant", reply);
  await sock.sendMessage(chatId, { text: reply });

  return true;
}

module.exports = { start, handleMessage };
