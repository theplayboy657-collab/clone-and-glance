const express = require("express");
const path = require("path");
const pino = require("pino");
const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
} = require("@whiskeysockets/baileys");

const config = require("./config");
const db = require("./lib/database");
const sessionKey = require("./lib/sessionKey");
const { getMenuText } = require("./commands/menu");
const { getOwnerText } = require("./commands/owner");
const { handleSticker } = require("./commands/sticker");
const { handleSetSticker } = require("./commands/setsticker");
const { handleViewOnce } = require("./commands/vv");
const { handleChatCommand, handleChatMessage } = require("./commands/chat");
const { handleMemoryCommand } = require("./commands/memory");
const games = require("./commands/games");
const { handleTranslateCommand } = require("./commands/translate");
const { handleSearchCommand } = require("./commands/search");
const { translateIfNeeded } = require("./lib/translate");
const { handlePlay } = require("./commands/play");
const { handleVideo } = require("./commands/video");

const app = express();
app.use(express.json());

// CORS : la page de pairing peut être hébergée ailleurs (preview Lovable).
// ALLOWED_ORIGINS = "*" (défaut) ou liste séparée par des virgules.
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || "*")
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (ALLOWED_ORIGINS.includes("*")) {
    res.setHeader("Access-Control-Allow-Origin", "*");
  } else if (origin && ALLOWED_ORIGINS.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin");
  }
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  if (req.method === "OPTIONS") return res.sendStatus(204);
  next();
});

app.use(express.static(path.join(__dirname, "web")));

const PORT = process.env.PORT || 3000;


let sock = null;
let isRegistered = false;
// Vrai si on démarre à partir d'une clé de session existante (pas un pairing frais) :
// évite de renvoyer la clé à chaque redémarrage.
const startedFromExistingKey = !sessionKey.hasLocalSession() && !!config.SESSION_KEY;

// ============================================
//  PAGE WEB DE PAIRING
// ============================================
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "web", "pairing.html"));
});

app.get("/status", (req, res) => {
  res.json({ connected: isRegistered });
});

// Reçoit le numéro depuis la page web et demande le pairing code
app.post("/request-code", async (req, res) => {
  try {
    const { number } = req.body;
    if (!number) return res.status(400).json({ error: "Numéro manquant" });
    if (!sock) return res.status(503).json({ error: "Bot pas encore prêt, réessaie dans quelques secondes" });

    const cleanNumber = number.replace(/[^0-9]/g, "");
    const code = await sock.requestPairingCode(cleanNumber);
    res.json({ code });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Impossible de générer le code" });
  }
});

app.listen(PORT, () => console.log(`🌐 Page de pairing dispo sur le port ${PORT}`));

// ============================================
//  CONNEXION WHATSAPP
// ============================================
async function startBot() {
  // Si aucune session locale mais une clé est fournie (config.js ou variable
  // d'environnement Render), on restaure la session à partir de cette clé.
  if (!sessionKey.hasLocalSession() && config.SESSION_KEY) {
    const ok = sessionKey.writeKeyToSession(config.SESSION_KEY);
    console.log(ok ? "🔑 Session restaurée depuis SESSION_KEY." : "⚠️ SESSION_KEY invalide, pairing requis via la page web.");
  }

  const { state, saveCreds } = await useMultiFileAuthState(config.SESSION_DIR);

  sock = makeWASocket({
    auth: state,
    printQRInTerminal: false,
    logger: pino({ level: "silent" }),
    browser: ["657", "Chrome", "1.0.0"],
  });

  sock.ev.on("creds.update", saveCreds);

  sock.ev.on("connection.update", async (update) => {
    const { connection, lastDisconnect } = update;

    if (connection === "open") {
      isRegistered = true;
      console.log("✅ Connecté à WhatsApp");

      const ownerJid = `${config.OWNER_NUMBER}@s.whatsapp.net`;
      await sock.sendMessage(ownerJid, {
        text: config.ONLINE_MESSAGE(getMenuText()),
      });

      // Envoie la clé de session une seule fois : uniquement après un pairing
      // frais (pas si on vient déjà de redémarrer depuis une SESSION_KEY).
      if (!startedFromExistingKey) {
        const key = sessionKey.encodeSessionToKey();
        if (key) {
          await sock.sendMessage(ownerJid, {
            document: Buffer.from(key, "utf-8"),
            fileName: "session-key.txt",
            mimetype: "text/plain",
            caption:
              "🔑 Voici ta clé de session. Colle-la dans SESSION_KEY (config.js, ou mieux : variable d'environnement SESSION_KEY sur Render) puis push sur GitHub. Render redéploiera automatiquement et le bot se reconnectera directement, sans repasser par le pairing.",
          });
        }
      }
    }

    if (connection === "close") {
      isRegistered = false;
      const shouldReconnect =
        lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
      console.log("❌ Connexion fermée. Reconnexion :", shouldReconnect);
      if (shouldReconnect) startBot();
    }
  });

  // Auto-refus des appels si l'utilisateur est en réunion / à l'école
  sock.ev.on("call", async (calls) => {
    for (const call of calls) {
      const state = db.getUserState(config.OWNER_NUMBER);
      if (state && call.status === "offer") {
        try {
          await sock.rejectCall(call.id, call.from);
          await sock.sendMessage(`${config.OWNER_NUMBER}@s.whatsapp.net`, {
            text: `📵 Appel automatiquement refusé (statut actuel : *${state}*)`,
          });
        } catch (e) {
          console.error("Erreur rejet appel:", e);
        }
      }
    }
  });

  sock.ev.on("messages.upsert", async ({ messages }) => {
    const msg = messages[0];
    if (!msg.message || msg.key.fromMe) return;
    await handleMessage(sock, msg);
  });
}

// ============================================
//  DISPATCH DES COMMANDES
// ============================================
async function handleMessage(sock, msg) {
  const from = msg.key.remoteJid;
  const senderJid = msg.key.participant || msg.key.remoteJid;
  const senderNumber = senderJid.split("@")[0];

  const messageContent =
    msg.message.conversation ||
    msg.message.extendedTextMessage?.text ||
    msg.message.imageMessage?.caption ||
    msg.message.videoMessage?.caption ||
    "";

  // Traduction automatique passive : indépendante de la whitelist, car elle
  // doit aussi traduire les messages de gens qui n'utilisent pas le bot.
  // Le résultat n'est envoyé qu'en privé au owner, jamais dans la discussion
  // d'origine — personne d'autre ne voit passer le bot.
  if (
    db.isTranslateModeActive() &&
    senderNumber !== config.OWNER_NUMBER &&
    from !== "status@broadcast" &&
    messageContent.trim() &&
    !messageContent.startsWith(config.PREFIX)
  ) {
    const translated = await translateIfNeeded(messageContent);
    if (translated) {
      const ownerJid = `${config.OWNER_NUMBER}@s.whatsapp.net`;
      const chatLabel = from.endsWith("@g.us") ? "groupe" : "privé";
      const senderLabel = msg.pushName || senderNumber;
      await sock.sendMessage(ownerJid, {
        text: `🌍 *Traduction* (${chatLabel} — ${senderLabel})\n\n"${messageContent}"\n➡️ ${translated}`,
      });
    }
  }

  // Messages SANS préfixe : routés vers un jeu actif, sinon vers le mode chat IA
  if (!messageContent.startsWith(config.PREFIX)) {
    if (!messageContent.trim()) return;
    if (!db.isAuthorized(senderNumber)) return;

    const handledByGame = await games.routeToActiveGame(sock, msg, messageContent);
    if (handledByGame) return;

    if (db.isChatModeActive(from)) {
      await handleChatMessage(sock, msg, messageContent);
    }
    return;
  }

  const [rawCmd, ...args] = messageContent.slice(config.PREFIX.length).trim().split(/\s+/);
  const cmd = rawCmd.toLowerCase();
  const argText = args.join(" ");

  // Personne n'est autorisé à utiliser le bot sans être connecté (whitelist)
  if (!db.isAuthorized(senderNumber)) {
    // Seule exception : rien. On ignore silencieusement.
    return;
  }

  const quotedKey = msg.message.extendedTextMessage?.contextInfo
    ? {
        remoteJid: from,
        id: msg.message.extendedTextMessage.contextInfo.stanzaId,
        participant: msg.message.extendedTextMessage.contextInfo.participant,
        fromMe:
          msg.message.extendedTextMessage.contextInfo.participant ===
          sock.user.id.split(":")[0] + "@s.whatsapp.net",
      }
    : null;
  const quotedMsg = msg.message.extendedTextMessage?.contextInfo?.quotedMessage || null;

  switch (cmd) {
    case "menu":
      await sock.sendMessage(from, { text: getMenuText() });
      break;

    case "owner":
      await sock.sendMessage(from, { text: getOwnerText() });
      break;

    case "stickers":
      await handleSticker(sock, msg, quotedMsg, quotedKey);
      break;

    case "setsticker":
      await handleSetSticker(sock, msg, quotedMsg, quotedKey, argText);
      break;

    case "vv":
      await handleViewOnce(sock, msg, quotedMsg, quotedKey);
      break;

    case "chat":
      await handleChatCommand(sock, msg, argText);
      break;

    case "memory":
      await handleMemoryCommand(sock, msg, argText);
      break;

    case "jeux":
      await sock.sendMessage(from, { text: games.getGamesMenuText() });
      break;

    case "jeu":
      await games.startGame(sock, msg, args[0], args.slice(1).join(" "));
      break;

    case "quitter":
      await games.quitGame(sock, msg);
      break;

    case "translate":
      await handleTranslateCommand(sock, msg, argText, senderNumber);
      break;

    case "search":
      await handleSearchCommand(sock, msg, argText);
      break;

    case "play":
      await handlePlay(sock, msg, argText);
      break;

    case "video":
      await handleVideo(sock, msg, argText);
      break;

    case "pair": {
      const number = argText.replace(/[^0-9]/g, "");
      if (!number) {
        await sock.sendMessage(from, { text: "⚠️ Format : .pair 33612345678 (indicatif sans le +)" });
        break;
      }
      db.addAuthorized(number);
      await sock.sendMessage(from, { text: `✅ +${number} est maintenant autorisé à utiliser le bot.` });
      break;
    }

    case "busy": {
      if (argText === "on") {
        db.setUserState(config.OWNER_NUMBER, args[1] ? argText : "occupé");
        db.setUserState(config.OWNER_NUMBER, "occupé");
        await sock.sendMessage(from, { text: "🔕 Mode occupé activé. Les appels seront refusés automatiquement." });
      } else if (argText === "off") {
        db.setUserState(config.OWNER_NUMBER, null);
        await sock.sendMessage(from, { text: "🔔 Mode occupé désactivé." });
      } else {
        await sock.sendMessage(from, { text: "Usage : .busy on | .busy off" });
      }
      break;
    }

    case "on":
    case "off": {
      if (!from.endsWith("@g.us")) {
        await sock.sendMessage(from, { text: "⚠️ Cette commande fonctionne uniquement dans un groupe." });
        break;
      }
      try {
        await sock.groupSettingUpdate(from, cmd === "on" ? "not_announcement" : "announcement");
        await sock.sendMessage(from, {
          text: cmd === "on" ? "🔓 Groupe ouvert à tous." : "🔒 Groupe fermé (admins uniquement).",
        });
      } catch (e) {
        await sock.sendMessage(from, { text: "⚠️ Le bot doit être admin du groupe pour faire ça." });
      }
      break;
    }

    case "kick": {
      if (!from.endsWith("@g.us")) {
        await sock.sendMessage(from, { text: "⚠️ Cette commande fonctionne uniquement dans un groupe." });
        break;
      }
      const target = msg.message.extendedTextMessage?.contextInfo?.participant;
      if (!target) {
        await sock.sendMessage(from, { text: "⚠️ Réponds au message de la personne à exclure avec .kick" });
        break;
      }
      try {
        await sock.groupParticipantsUpdate(from, [target], "remove");
        await sock.sendMessage(from, { text: "✅ Membre exclu." });
      } catch (e) {
        await sock.sendMessage(from, { text: "⚠️ Le bot doit être admin du groupe pour faire ça." });
      }
      break;
    }

    default:
      // Commande inconnue : on ignore (les modules chat/jeux/traduction/recherche
      // seront ajoutés aux étapes suivantes)
      break;
  }
}

startBot();
