const db = require("../lib/database");
const { askAI } = require("../lib/ai");

/**
 * .chat mode        -> active le mode discussion sur la conversation en cours
 * .chat off          -> désactive le mode
 * (message sans préfixe, quand actif) -> envoyé à l'IA avec mémoire persistante
 */
async function handleChatCommand(sock, msg, argText) {
  const chatId = msg.key.remoteJid;

  if (argText === "off") {
    db.setChatMode(chatId, false);
    await sock.sendMessage(chatId, { text: "🧠 Mode chat désactivé." });
    return;
  }

  // "mode" ou vide -> on active
  db.setChatMode(chatId, true);
  await sock.sendMessage(chatId, {
    text: "🧠 Mode chat activé. Écris-moi directement (sans point) et je te réponds.\n\n`.chat off` pour quitter.",
  });
}

/**
 * Appelé pour tout message texte sans préfixe quand le mode chat est actif
 */
async function handleChatMessage(sock, msg, text) {
  const chatId = msg.key.remoteJid;

  db.pushMemory(chatId, "user", text);
  const history = db.getMemory(chatId);

  const reply = await askAI(history);

  db.pushMemory(chatId, "assistant", reply);
  await sock.sendMessage(chatId, { text: reply });
}

module.exports = { handleChatCommand, handleChatMessage };
