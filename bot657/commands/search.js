const { askAIWithSearch } = require("../lib/ai");

async function handleSearchCommand(sock, msg, query) {
  const chatId = msg.key.remoteJid;

  if (!query) {
    await sock.sendMessage(chatId, { text: "⚠️ Usage : .search {ta question}" });
    return;
  }

  await sock.sendMessage(chatId, { text: "🔍 Recherche en cours..." });
  const answer = await askAIWithSearch(query);
  await sock.sendMessage(chatId, { text: answer });
}

module.exports = { handleSearchCommand };
