const { downloadMediaMessage } = require("@whiskeysockets/baileys");
const config = require("../config");

/**
 * Récupère le contenu d'un message "vue unique" (image/vidéo/audio)
 * et le renvoie en DM sur le numéro du owner.
 * Usage : répondre au message vue unique avec ".vv"
 */
async function handleViewOnce(sock, msg, quotedMsg, quotedKey) {
  const viewOnce =
    quotedMsg?.viewOnceMessage?.message ||
    quotedMsg?.viewOnceMessageV2?.message ||
    quotedMsg;

  const type = viewOnce?.imageMessage
    ? "image"
    : viewOnce?.videoMessage
    ? "video"
    : viewOnce?.audioMessage
    ? "audio"
    : null;

  if (!type) {
    await sock.sendMessage(msg.key.remoteJid, {
      text: "⚠️ Réponds à un média vue unique (photo, vidéo ou audio) avec .vv",
    });
    return;
  }

  const fakeMsg = { key: quotedKey, message: viewOnce };
  const buffer = await downloadMediaMessage(fakeMsg, "buffer", {});

  const ownerJid = `${config.OWNER_NUMBER}@s.whatsapp.net`;

  if (type === "image") {
    await sock.sendMessage(ownerJid, { image: buffer, caption: "👁 Média vue unique récupéré" });
  } else if (type === "video") {
    await sock.sendMessage(ownerJid, { video: buffer, caption: "👁 Média vue unique récupéré" });
  } else if (type === "audio") {
    await sock.sendMessage(ownerJid, { audio: buffer, mimetype: "audio/mp4" });
  }

  await sock.sendMessage(msg.key.remoteJid, {
    text: "✅ Média récupéré et envoyé sur ton numéro.",
  });
}

module.exports = { handleViewOnce };
