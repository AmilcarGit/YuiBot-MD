//CÓDIGO ORIGINAL DE YUIBOT-MD
const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
} = require('@whiskeysockets/baileys')
const { Boom } = require('@hapi/boom')
const pino = require('pino')
const path = require('path')
const fs = require('fs')

const { loadCommands } = require('./lib/cargador')
const { getMessageBody, parseCommand, isOwner } = require('./lib/handler')
const { iniciarHeartbeat, puedeResponderSubbot } = require('./lib/red')
const { esDuenoDeSubbot } = require('./lib/subbots')
const config = require('./defaults')

const numero = process.argv[2]

if (!numero) {
  console.error('❌ Debes indicar el número del subbot. Uso: node subbot.js <numero>')
  process.exit(1)
}

const carpetaSubbot = path.join(__dirname, 'subbots', numero)
const sessionPath = path.join(carpetaSubbot, 'session')
const codeFilePath = path.join(carpetaSubbot, 'code.txt')

fs.mkdirSync(sessionPath, { recursive: true })

let detenerHeartbeatSubbot = null

function obtenerIdentidadesPropias(sock, msg) {
  const identidades = [
    sock.user?.id,
    sock.user?.lid,
    msg.key.fromMe ? msg.key.remoteJid : null,
    msg.key.fromMe ? msg.key.remoteJidAlt : null,
  ]

  return identidades.filter(Boolean)
}

async function startSubBot() {
  const { state, saveCreds } = await useMultiFileAuthState(sessionPath)
  const { version } = await fetchLatestBaileysVersion()

  const yaVinculado = state.creds.registered

  const sock = makeWASocket({
    version,
    auth: state,
    logger: pino({ level: 'silent' }),
    printQRInTerminal: false,
  })

  const { commands, categories } = loadCommands()

  if (!yaVinculado) {
    setTimeout(async () => {
      try {
        const code = await sock.requestPairingCode(numero.trim())
        fs.writeFileSync(codeFilePath, code)
        console.log(`🔑 Código de vinculación para subbot ${numero}: ${code}`)
      } catch (err) {
        console.error('❌ No se pudo generar el código de vinculación:', err)
      }
    }, 3000)
  }

  sock.ev.on('connection.update', (update) => {
    const { connection, lastDisconnect } = update

    if (connection === 'close') {
      const statusCode = new Boom(lastDisconnect?.error)?.output?.statusCode
      const shouldReconnect = statusCode !== DisconnectReason.loggedOut
      console.log(`❌ [subbot ${numero}] Conexión cerrada.`, shouldReconnect ? 'Reconectando...' : 'Sesión cerrada.')
      if (shouldReconnect) {
        setTimeout(() => startSubBot().catch((err) => console.error('❌ Error reconectando subbot:', err)), 3000)
      }
    } else if (connection === 'open') {
      console.log(`✅ Subbot ${numero} conectado a WhatsApp.`)
      if (fs.existsSync(codeFilePath)) fs.unlink(codeFilePath, () => {})

      if (detenerHeartbeatSubbot) detenerHeartbeatSubbot()
      detenerHeartbeatSubbot = iniciarHeartbeat(numero)
    }
  })

  sock.ev.on('creds.update', saveCreds)

  sock.ev.on('messages.upsert', async ({ messages, type }) => {
    if (type !== 'notify') return

    const msg = messages[0]
    if (!msg.message) return

    const jid = msg.key.remoteJid
    const esGrupo = jid.endsWith('@g.us')

    if (esGrupo) {
      const puedeResponder = puedeResponderSubbot(numero, jid)
      if (!puedeResponder) return
    }

    const body = getMessageBody(msg)

    const parsed = parseCommand(body, config)
    if (!parsed) return

    const command = commands.get(parsed.commandName)
    if (!command) return

    if (command.ownerOnly) {
      const senderJids = [
        msg.key.participantAlt,
        msg.key.remoteJidAlt,
        msg.key.participant,
        msg.key.remoteJid,
      ].filter(Boolean)

      const identidadesPropias = obtenerIdentidadesPropias(sock, msg)
      const candidatosPropietario = [...identidadesPropias, ...senderJids].filter(Boolean)
      const esDueno = esDuenoDeSubbot(numero, candidatosPropietario)
      const esOwnerPrincipal = senderJids.some((senderJid) => isOwner(senderJid, config))

      if (!esOwnerPrincipal && !esDueno) {
        await sock.sendMessage(jid, { text: '⛔ Este comando es solo para el dueño de este subbot.' })
        return
      }
    }

    try {
      await command.execute(sock, msg, parsed.args, { commands, categories, config, esSubBot: true, subbotNumero: numero })
    } catch (err) {
      console.error(`[subbot ${numero}] Error ejecutando "${parsed.commandName}":`, err)
      await sock.sendMessage(jid, { text: '⚠️ Ocurrió un error ejecutando ese comando.' })
    }
  })
}

startSubBot().catch((err) => console.error(`❌ Error al iniciar subbot ${numero}:`, err))
