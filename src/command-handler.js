const fs = require('fs');
const path = require('path');
const { loadCommands } = require('./utils/commandLoader');

let commands = null;

function ensureCommandsLoaded() {
  if (!commands) commands = loadCommands();
}

async function handleMessage({ sock, msg }) {
  ensureCommandsLoaded();
  const from = msg.key.remoteJid;
  const sender = msg.key.participant || msg.key.remoteJid;
  const body =
    msg.message?.conversation ||
    msg.message?.extendedTextMessage?.text ||
    msg.message?.imageMessage?.caption ||
    msg.message?.videoMessage?.caption ||
    '';
  if (!body) return;

  const config = require('./config');
  if (!body.startsWith(config.prefix)) return;

  const [raw, ...args] = body.slice(config.prefix.length).trim().split(/\s+/);
  const cmdName = raw.toLowerCase();

  const cmds = commands;
  const cmd = cmds.get(cmdName);
  if (!cmd) return; // unknown

  // block execution if not paired
  const { isPaired } = require('./wa');
  if (!isPaired()) return; // ignore until paired

  const extra = {
    from,
    sender,
    isGroup: from.endsWith('@g.us'),
    groupMetadata: {},
    reply: async (text) => {
      await sock.sendMessage(from, { text }, { quoted: msg });
    },
  };

  try {
    await cmd.execute(sock, msg, args, extra);
  } catch (e) {
    console.error('Command execution error:', e);
  }
}

module.exports = { handleMessage };
