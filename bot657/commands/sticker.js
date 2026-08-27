const { downloadMediaMessage } = require("@whiskeysockets/baileys");
const { Sticker, StickerTypes } = require("wa-sticker-formatter");

/**
 * Crée un sticker à partir du message cité (image ou vidéo courte).
 * Le nom du pack = nom WhatsApp (pushName) de la personne qui exécute la commande.
 */
async function handleSticker(sock, msg, quotedMsg, quotedKey) {
  if (!quotedMsg) {
    await sock.sendMessage(msg.key.remoteJid, {
      text: "⚠️ Réponds à une photo ou une vidéo avec .stickers pour créer un sticker.",
    });
    return;
  }

  const isImage = !!quotedMsg.imageMessage;
  const isVideo = !!quotedMsg.videoMessage;

  if (!isImage && !isVideo) {
    await sock.sendMessage(msg.key.remoteJid, {
      text: "⚠️ Ce message n'est ni une image ni une vidéo.",
    });
    return;
  }

  const fakeMsg = {
    key: quotedKey,
    message: quotedMsg,
  };

  const buffer = await downloadMediaMessage(fakeMsg, "buffer", {});

  const authorName = msg.pushName || "657";

  const sticker = new Sticker(buffer, {
    pack: authorName, // nom du pack = nom WhatsApp de l'utilisateur
    author: "657",
    type: StickerTypes.FULL,
    quality: 70,
  });

  const stickerBuffer = await sticker.toBuffer();
  await sock.sendMessage(msg.key.remoteJid, { sticker: stickerBuffer });
}

module.exports = { handleSticker };
