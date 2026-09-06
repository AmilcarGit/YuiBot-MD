//CÓDIGO ORIGINAL DE YUIBOT-MD
const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys')
const { Boom } = require('@hapi/boom')
const pino = require('pino')
const readline = require('readline')
const config = require('./defaults')
const iaConfig = require('./config/ia.json')
const { getMessageBody, parseCommand, isOwner } = require('./lib/handler')
const { loadCommands } = require('./lib/cargador')

config.IA_ENABLED = iaConfig.enabled

let reconnectTimer = null
let connectionMode = null

async function seleccionarModo() {
  if (connectionMode) return connectionMode

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
  connectionMode = await new Promise((resolve) => {
    console.log('\n╭─ 🔐 VINCULACIÓN YUIBOT-MD')
    console.log('│ 1️⃣ QR')
    console.log('│ 2️⃣ Código de vinculación')
    console.log('╰─ Selecciona una opción:')
    rl.question('> ', (answer) => {
      rl.close()
      resolve(answer.trim() === '2' ? 'code' : 'qr')
    })
  })

  return connectionMode
}

async function startBot() {
  const { state, saveCreds } = await useMultiFileAuthState('./sesion')
  const { commands, categories } = loadCommands()
  const mode = await seleccionarModo()

  const sock = makeWASocket({
    auth: state,
    logger: pino({ level: 'silent' }),
    printQRInTerminal: mode === 'qr'
  })

  if (mode === 'code' && !state.creds.registered) {
    const phoneNumber = config.PHONE_NUMBER || ''
    if (!phoneNumber) {
      console.log('❌ Configura PHONE_NUMBER en defaults.js para usar el código de vinculación')
      process.exit(1)
    }

    const cleanNumber = String(phoneNumber).replace(/[^0-9]/g, '')
    const code = await sock.requestPairingCode(cleanNumber)
    console.log(`\n🔐 CÓDIGO DE VINCULACIÓN: ${code}`)
    console.log('WhatsApp → Dispositivos vinculados → Vincular un dispositivo → Vincular con número de teléfono')
  }

  sock.ev.on('creds.update', saveCreds)

  sock.ev.on('connection.update', ({ connection, lastDisconnect }) => {
    if (connection === 'open') {
      console.log(`✅ ${config.BOT_NAME} conectado correctamente`)
    }

    if (connection === 'close') {
      const reason = new Boom(lastDisconnect?.error)?.output?.statusCode
      const shouldReconnect = reason !== DisconnectReason.loggedOut
      console.log(`❌ Conexión cerrada. Reconectar: ${shouldReconnect}`)

      if (shouldReconnect && !reconnectTimer) {
        reconnectTimer = setTimeout(() => {
          reconnectTimer = null
          startBot().catch(console.error)
        }, 3000)
      }
    }
  })

  sock.ev.on('messages.upsert', async ({ messages }) => {
    const msg = messages?.[0]
    if (!msg?.message) return
    if (msg.key?.fromMe) return

    try {
      await sock.readMessages([msg.key])
    } catch {}

    const jid = msg.key.remoteJid
    const body = getMessageBody(msg)
    if (!body) return

    console.log(`📩 ${jid}: ${body}`)

    const parsed = parseCommand(body, config)
    if (!parsed) return

    const { commandName, args } = parsed
    const command = commands.get(commandName)
    if (!command) return

    const senderJid = msg.key.participant || jid

    if (command.ownerOnly && !isOwner(senderJid, config)) {
      await sock.sendMessage(jid, { text: '❌ Este comando es solo para el propietario.' })
      return
    }

    try {
      await command.execute(sock, msg, args, { commands, categories, config })
    } catch (error) {
      console.error(`❌ Error en ${commandName}:`, error)
      await sock.sendMessage(jid, { text: '❌ Ocurrió un error al ejecutar el comando.' })
    }
  })
}

startBot().catch(console.error)
