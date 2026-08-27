const fs = require("fs");
const { downloadAudio, MAX_SIZE_MB } = require("../lib/downloader");

async function handlePlay(sock, msg, query) {
  const chatId = msg.key.remoteJid;

  if (!query) {
    await sock.sendMessage(chatId, { text: "⚠️ Usage : .play {titre de la musique}" });
    return;
  }

  await sock.sendMessage(chatId, { text: `🔎 Recherche de "${query}"...` });

  let result;
  try {
    result = await downloadAudio(query);
  } catch (e) {
    console.error("Erreur .play:", e);
    await sock.sendMessage(chatId, { text: "⚠️ Erreur lors du téléchargement. Réessaie avec un titre plus précis." });
    return;
  }

  if (!result) {
    await sock.sendMessage(chatId, { text: "⚠️ Aucun résultat trouvé." });
    return;
  }

  if (result.sizeMB > MAX_SIZE_MB) {
    fs.unlinkSync(result.path);
    await sock.sendMessage(chatId, {
      text: `⚠️ "${result.title}" fait ${result.sizeMB.toFixed(1)} Mo, trop volumineux pour être envoyé. Essaie un titre plus précis (ex: version courte/radio edit).`,
    });
    return;
  }

  await sock.sendMessage(chatId, {
    audio: fs.readFileSync(result.path),
    mimetype: "audio/mp4",
    fileName: `${result.title}.m4a`,
  });

  fs.unlinkSync(result.path);
}

module.exports = { handlePlay };
