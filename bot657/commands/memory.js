const db = require("../lib/database");

/**
 * .memory show   -> résumé de ce que le bot garde en mémoire pour cette discussion
 * .memory clear  -> efface la mémoire persistante de cette discussion
 */
async function handleMemoryCommand(sock, msg, argText) {
  const chatId = msg.key.remoteJid;

  if (argText === "clear") {
    db.clearMemory(chatId);
    await sock.sendMessage(chatId, { text: "🗑️ Mémoire de cette discussion effacée." });
    return;
  }

  const history = db.getMemory(chatId);
  if (history.length === 0) {
    await sock.sendMessage(chatId, { text: "📭 Aucune mémoire enregistrée pour cette discussion." });
    return;
  }

  const preview = history
    .slice(-10)
    .map((m) => `${m.role === "user" ? "🗣️" : "🤖"} ${m.content.slice(0, 80)}`)
    .join("\n");

  await sock.sendMessage(chatId, {
    text: `🧠 *Mémoire (10 derniers échanges)*\n\n${preview}\n\n_.memory clear pour tout effacer_`,
  });
}

module.exports = { handleMemoryCommand };
