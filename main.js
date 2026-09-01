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
const readline = require('readline');

const { loadCommands } = require('./lib/cargador');
const { getMessageBody, parseCommand, isOwner } = require('./lib/handler');
const config = require('./defaults');

let metodoElegido = null; // se decide una sola vez por ejecución, no en cada reconexión

function askQuestion(text) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(text, (answer) => {
      rl.close();
      resolve(answer);
    });
  });
}

async function elegirMetodoDeVinculacion() {
  console.log(`\n⛧───「 ${config.BOT_NAME} 」───⛧`);
  console.log('¿Cómo quieres vincular el bot?\n');
  console.log('  [Enter]  → Vincular con código QR');
  console.log('  [1]      → Vincular con código de emparejamiento (número de teléfono)\n');

  const respuesta = await askQuestion('Elige una opción: ');
  return respuesta.trim() === '1';
}

async function startBot() {
  const { state, saveCreds } = await useMultiFileAuthState(
    path.join(__dirname, 'session')
  );
  const { version } = await fetchLatestBaileysVersion();

  const yaVinculado = state.creds.registered;

  if (metodoElegido === null) {
    metodoElegido = yaVinculado ? false : await elegirMetodoDeVinculacion();
  }

  const usePairingCode = !yaVinculado && metodoElegido;

  const sock = makeWASocket({
    version,
    auth: state,
    logger: pino({ level: 'silent' }),
    printQRInTerminal: false,
  });

  const { commands, categories } = loadCommands();

  if (usePairingCode) {
    const phoneNumber = config.PHONE_NUMBER || (await askQuestion('📞 Escribe tu número con código de país, sin "+" ni espacios (ej: 5218110000000): '));

    setTimeout(async () => {
      try {
        const code = await sock.requestPairingCode(phoneNumber.trim());
        console.log(`🔑 Tu código de vinculación de ${config.BOT_NAME} es: ${code}`);
        console.log('📱 Ve a WhatsApp > Dispositivos vinculados > Vincular con número de teléfono, e ingresa ese código.');
      } catch (err) {
        console.error('❌ No se pudo generar el código de vinculación:', err);
      }
    }, 3000);
  }

  sock.ev.on('connection.update', (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr && !usePairingCode) {
      console.log(`📱 Escanea este QR con WhatsApp para vincular ${config.BOT_NAME}:`);
      qrcode.generate(qr, { small: true });
    }

    if (connection === 'close') {
      const statusCode = new Boom(lastDisconnect?.error)?.output?.statusCode;
      const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
      console.log('❌ Conexión cerrada.', shouldReconnect ? 'Reconectando...' : 'Sesión cerrada, borra /session y vuelve a escanear.');
      if (!shouldReconnect) metodoElegido = null; // si te desloguearon de verdad, vuelve a preguntar la próxima vez
      if (shouldReconnect) startBot();
    } else if (connection === 'open') {
      console.log(`✅ ${config.BOT_NAME} conectado a WhatsApp.`);
    }
  });

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('messages.upsert', async ({ messages, type }) => {
    if (type !== 'notify') return;

    const msg = messages[0];
    if (!msg.message) return;

    const jid = msg.key.remoteJid;
    const body = getMessageBody(msg);
    const esGrupo = jid.endsWith('@g.us');
    const nombre = msg.pushName || 'Desconocido';
    const remitente = msg.key.participantAlt || msg.key.participant || jid;
    const numeroRemitente = remitente.split('@')[0].split(':')[0];
    const hora = new Date().toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

    console.log(
      `[${hora}] ${esGrupo ? '👥' : '👤'} ${nombre} (${numeroRemitente})${esGrupo ? ` en grupo` : ''}: ${body || '[sin texto / multimedia]'}`
    );

    if (msg.key.fromMe) return;

    const parsed = parseCommand(body, config);
    if (!parsed) return;

    const command = commands.get(parsed.commandName);
    if (!command) return;

    if (command.ownerOnly) {
      const senderJid = msg.key.participantAlt || msg.key.participant || jid;

      if (!isOwner(senderJid, config)) {
        await sock.sendMessage(jid, { text: '⛔ Este comando es solo para el owner del bot.' });
        return;
      }
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