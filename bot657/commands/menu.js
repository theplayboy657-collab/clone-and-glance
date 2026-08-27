const config = require("../config");

function getMenuText() {
  return `╭─❒ *${config.BOT_NAME} — MENU* ❒
│
│ 🧠 *IA*
│ ${config.PREFIX}chat mode — active le mode discussion avec le bot
│ ${config.PREFIX}chat off — désactive le mode discussion
│ ${config.PREFIX}memory show / clear — voir ou effacer la mémoire
│
│ 🎨 *Stickers*
│ ${config.PREFIX}stickers — répondre à une photo/vidéo pour créer un sticker
│ ${config.PREFIX}setsticker {nom} — répondre à un sticker pour renommer son pack
│
│ 👁 *Vue unique*
│ ${config.PREFIX}vv — répondre à un média vue unique pour le récupérer
│
│ 🎮 *Jeux*
│ ${config.PREFIX}jeux — menu des jeux disponibles
│ ${config.PREFIX}jeu {nom} — démarrer un jeu
│ ${config.PREFIX}quitter — arrêter le jeu en cours
│
│ 🌍 *Traduction*
│ ${config.PREFIX}translate on/off — traduit en privé tout message reçu qui n'est pas en français, dans toutes tes discussions
│
│ 🔍 *Recherche & téléchargement*
│ ${config.PREFIX}search {texte} — recherche web en temps réel
│ ${config.PREFIX}play {titre} — télécharger musique
│ ${config.PREFIX}video {titre} — télécharger vidéo
│
│ 👥 *Gestion de groupe*
│ ${config.PREFIX}kick — répondre au message d'un membre pour l'exclure
│ ${config.PREFIX}on / ${config.PREFIX}off — ouvrir / fermer le groupe
│
│ 👤 *Accès*
│ ${config.PREFIX}pair {numéro} — autoriser un nouvel utilisateur
│ ${config.PREFIX}owner — infos du propriétaire
│
│ ⏸ *Disponibilité*
│ ${config.PREFIX}busy on/off — coupe automatiquement les appels entrants
╰────────────────`;
}

module.exports = { getMenuText };
