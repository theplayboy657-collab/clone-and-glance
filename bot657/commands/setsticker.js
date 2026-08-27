const { downloadMediaMessage } = require("@whiskeysockets/baileys");
const { Sticker, StickerTypes } = require("wa-sticker-formatter");

/**
 * Reconstruit un sticker déjà envoyé avec un nouveau nom de pack.
 * Usage : répondre à un sticker avec ".setsticker {nom}"
 */
async function handleSetSticker(sock, msg, quotedMsg, quotedKey, newName) {
  if (!quotedMsg || !quotedMsg.stickerMessage) {
    await sock.sendMessage(msg.key.remoteJid, {
      text: "⚠️ Réponds à un sticker avec .setsticker {nom} pour le renommer.",
    });
    return;
  }

  if (!newName) {
    await sock.sendMessage(msg.key.remoteJid, {
      text: "⚠️ Précise un nom. Exemple : .setsticker Mon Pack",
    });
    return;
  }

  const fakeMsg = {
    key: quotedKey,
    message: quotedMsg,
  };

  const buffer = await downloadMediaMessage(fakeMsg, "buffer", {});

  const sticker = new Sticker(buffer, {
    pack: newName,
    author: "657",
    type: StickerTypes.FULL,
    quality: 70,
  });

  const stickerBuffer = await sticker.toBuffer();
  await sock.sendMessage(msg.key.remoteJid, { sticker: stickerBuffer });
}

module.exports = { handleSetSticker };
