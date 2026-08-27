const makeWASocket = require('@adiwajshing/baileys').default || require('@adiwajshing/baileys');
const qrcode = require('qrcode');
const { loadAuthFromDb, saveAuthToDb } = require('./auth-db');
const EventEmitter = require('events');

const appEvents = new EventEmitter();
let paired = false;

function isPaired() { return paired; }

async function startSock() {
  // Try DB auth first (recommended for Render). If none, fallback to single-file
  let authState = null;
  try {
    const dbAuth = await loadAuthFromDb();
    if (dbAuth) {
      authState = dbAuth;
      console.log('Auth loaded from DB');
    }
  } catch (e) {
    console.warn('DB auth load failed, falling back to file auth:', e.message);
  }

  let fileState;
  if (!authState) {
    // lazy require to avoid adding a hard dependency if not present
    try {
      const { useSingleFileAuthState } = require('@adiwajshing/baileys');
      fileState = useSingleFileAuthState('./auth_info.json');
      authState = fileState.state;
      console.log('Using single-file auth state (auth_info.json)');
    } catch (e) {
      console.warn('useSingleFileAuthState not available, proceeding without file state');
    }
  }

  const sock = makeWASocket({ auth: authState, printQRInTerminal: false });

  sock.ev.on('creds.update', async () => {
    try {
      if (typeof saveAuthToDb === 'function' && sock.authState) {
        await saveAuthToDb(sock.authState);
      }
    } catch (e) {
      console.error('Failed to save auth to DB:', e);
    }
  });

  sock.ev.on('connection.update', (update) => {
    const { connection, qr, lastDisconnect } = update;
    if (qr) {
      qrcode.toDataURL(qr).then((dataUrl) => {
        appEvents.emit('qr', dataUrl);
      }).catch(console.error);
    }
    if (connection === 'open') {
      paired = true;
      console.log('WhatsApp connecté -> appairage terminé');
      appEvents.emit('paired', true);
    } else if (connection === 'close') {
      paired = false;
      console.log('WhatsApp déconnecté:', lastDisconnect?.error || lastDisconnect);
      appEvents.emit('paired', false);
    }
  });

  sock.ev.on('messages.upsert', async (m) => {
    if (!isPaired()) return; // ignore until paired
    try {
      const msg = m.messages && m.messages[0];
      if (!msg) return;
      const handler = require('./command-handler');
      await handler.handleMessage({ sock, msg });
    } catch (e) {
      console.error('Error handling message:', e);
    }
  });

  return { sock, appEvents, isPaired };
}

module.exports = { startSock, isPaired, appEvents };
