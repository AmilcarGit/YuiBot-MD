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
const { getMessageBody, parseCommand, isOwner } = require('./lib/handler');
const config = require('./defaults');

async function startBot() {
  const { state, saveCreds } = await useMultiFileAuthState(
    path.join(__dirname, 'session')
  );
  const { version } = await fetchLatestBaileysVersion();

  const sock = makeWASocket({
    version,
    auth: state,
    logger: pino({ level: 'silent' }),
    printQRInTerminal: false,
  });

  const { commands, categories } = loadCommands();

  sock.ev.on('connection.update', (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      console.log(`📱 Escanea este QR con WhatsApp para vincular ${config.BOT_NAME}:`);
      qrcode.generate(qr, { small: true });
    }

    if (connection === 'close') {
      const statusCode = new Boom(lastDisconnect?.error)?.output?.statusCode;
      const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
      console.log('❌ Conexión cerrada.', shouldReconnect ? 'Reconectando...' : 'Sesión cerrada, borra /session y vuelve a escanear.');
      if (shouldReconnect) startBot();
    } else if (connection === 'open') {
      console.log(`✅ ${config.BOT_NAME} conectado a WhatsApp.`);
    }
  });

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('messages.upsert', async ({ messages, type }) => {
    if (type !== 'notify') return;

    const msg = messages[0];
    if (!msg.message || msg.key.fromMe) return;

    const jid = msg.key.remoteJid;
    const body = getMessageBody(msg);

    const parsed = parseCommand(body, config);
    if (!parsed) return;

    const command = commands.get(parsed.commandName);
    if (!command) return;

    if (command.ownerOnly && !isOwner(msg.key.participant || jid, config)) {
      await sock.sendMessage(jid, { text: '⛔ Este comando es solo para el owner del bot.' });
      return;
    }

    try {
      await command.execute(sock, msg, parsed.args, { commands, categories, config });
    } catch (err) {
      console.error(`Error ejecutando "${parsed.commandName}":`, err);
      await sock.sendMessage(jid, {
        text: '⚠️ Ocurrió un error ejecutando ese comando.',
      });
    }
  });
}

startBot().catch((err) => console.error(`Error al iniciar ${config.BOT_NAME}:`, err));