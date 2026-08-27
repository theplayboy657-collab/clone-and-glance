const fs = require("fs");
const { downloadVideo, MAX_SIZE_MB } = require("../lib/downloader");

async function handleVideo(sock, msg, query) {
  const chatId = msg.key.remoteJid;

  if (!query) {
    await sock.sendMessage(chatId, { text: "⚠️ Usage : .video {titre de la vidéo}" });
    return;
  }

  await sock.sendMessage(chatId, { text: `🔎 Recherche de "${query}"...` });

  let result;
  try {
    result = await downloadVideo(query);
  } catch (e) {
    console.error("Erreur .video:", e);
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
      text: `⚠️ "${result.title}" fait ${result.sizeMB.toFixed(1)} Mo, trop volumineux pour être envoyé. Essaie un titre plus précis ou une vidéo plus courte.`,
    });
    return;
  }

  await sock.sendMessage(chatId, {
    video: fs.readFileSync(result.path),
    caption: result.title,
    fileName: `${result.title}.mp4`,
  });

  fs.unlinkSync(result.path);
}

module.exports = { handleVideo };
