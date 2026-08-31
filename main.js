//CÓDIGO ORIGINAL DE YUIBOT-MD
const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
} = require('@whiskeysockets/baileys');
const { Boom } = require('@hapi/boom');
const qrcode = require('qrcode-terminal');
const pino = require('pino');
const path = require('path');

const { loadCommands } = require('./lib/cargador');
const { BOT_NAME, PREFIX } = require('./defaults');

async function startBot() {
  const { state, saveCreds } = await useMultiFileAuthState(
    path.join(__dirname, 'session')
  );
  const { version } = await fetchLatestBaileysVersion();

  const sock = makeWASocket({
    version,
    auth: state,
    logger: pino({ level: 'silent' }), // cambia a 'info' si quieres ver logs de Baileys
    printQRInTerminal: false, // lo manejamos manualmente abajo
  });

  const commands = loadCommands();

  // --- Conexión / QR ---
  sock.ev.on('connection.update', (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      console.log(`📱 Escanea este QR con WhatsApp para vincular ${BOT_NAME}:`);
      qrcode.generate(qr, { small: true });
    }

    if (connection === 'close') {
      const statusCode = new Boom(lastDisconnect?.error)?.output?.statusCode;
      const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
      console.log('❌ Conexión cerrada.', shouldReconnect ? 'Reconectando...' : 'Sesión cerrada, borra /session y vuelve a escanear.');
      if (shouldReconnect) startBot();
    } else if (connection === 'open') {
      console.log(`✅ ${BOT_NAME} conectado a WhatsApp.`);
    }
  });

  sock.ev.on('creds.update', saveCreds);

  // --- Manejo de mensajes ---
  sock.ev.on('messages.upsert', async ({ messages, type }) => {
    if (type !== 'notify') return;

    const msg = messages[0];
    if (!msg.message || msg.key.fromMe) return;

    const jid = msg.key.remoteJid;
    const body =
      msg.message.conversation ||
      msg.message.extendedTextMessage?.text ||
      msg.message.imageMessage?.caption ||
      '';

    if (!body.startsWith(PREFIX)) return;

    const args = body.slice(PREFIX.length).trim().split(/\s+/);
    const commandName = args.shift().toLowerCase();

    const command = commands.get(commandName);
    if (!command) return; // podrías responder "comando no encontrado" si prefieres

    try {
      await command.execute(sock, msg, args, commands);
    } catch (err) {
      console.error(`Error ejecutando "${commandName}":`, err);
      await sock.sendMessage(jid, {
        text: '⚠️ Ocurrió un error ejecutando ese comando.',
      });
    }
  });
}

startBot().catch((err) => console.error(`Error al iniciar ${BOT_NAME}:`, err));