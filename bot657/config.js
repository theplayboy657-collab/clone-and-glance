// ============================================
//  CONFIG DU BOT — modifiable directement sur GitHub
//  Aucune valeur secrète ici : le numéro WhatsApp du bot
//  n'est PAS mis ici, il se connecte via la page de pairing.
// ============================================

module.exports = {
  // Nom affiché du bot
  BOT_NAME: "657",

  // Infos affichées au premier démarrage, et ensuite
  // uniquement via la commande .owner
  OWNER_NAME: "Kyrox-dev",
  OWNER_NUMBER: "32035470", // format international SANS le "+"

  // Préfixe des commandes
  PREFIX: ".",

  // Message envoyé sur ton propre numéro quand le bot se connecte
  ONLINE_MESSAGE: (menuText) =>
    `✅ *657 est en ligne*\n\nLe bot est connecté et prêt à être utilisé.\n\n${menuText}`,

  // Dossier où sont stockées les infos de session WhatsApp (auth Baileys)
  SESSION_DIR: "./session",

  // Clé de session portable : après le tout premier pairing, le bot te
  // l'envoie en message WhatsApp (fichier session-key.txt). Colle-la ici
  // (ou, plus sûr, mets-la dans une variable d'environnement SESSION_KEY
  // sur Render — elle sera utilisée en priorité) pour que le bot se
  // reconnecte automatiquement sans repasser par la page de pairing.
  SESSION_KEY: process.env.SESSION_KEY || "",

  // Fichier JSON qui stocke les utilisateurs autorisés à utiliser le bot
  DB_FILE: "./lib/database.json",

  // --- IA (.chat mode) ---
  // La clé n'est JAMAIS mise ici. Sur Render : Settings > Environment >
  // ajouter une variable ANTHROPIC_API_KEY avec ta clé.
  AI_MODEL: "claude-sonnet-4-6",
  AI_MAX_HISTORY: 20, // nombre de messages gardés en mémoire par discussion
  AI_SYSTEM_PROMPT:
    "Tu es 657, l'assistant WhatsApp personnel de Kyrox-dev. Réponds en français, de façon naturelle et concise, adaptée à une conversation WhatsApp.",
};
