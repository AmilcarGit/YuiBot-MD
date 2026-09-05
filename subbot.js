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

  console.log(`🤖 [subbot ${numero}] Inicializado. Identidad: ${sock.user?.id || 'pendiente'} | LID: ${sock.user?.lid || 'pendiente'}`)

  if (!yaVinculado) {
    setTimeout(async () => {
      try {
        const code = await sock.requestPairingCode(numero.trim())
        fs.writeFileSync(codeFilePath, code)
        console.log(`🔑 Código de vinculación para subbot ${numero}: ${code}`)
      } catch (err) {
        console.error(`❌ [subbot ${numero}] No se pudo generar el código de vinculación:`, err)
      }
    }, 3000)
  }

  sock.ev.on('connection.update', (update) => {
    const { connection, lastDisconnect } = update

    if (connection === 'close') {
      const error = lastDisconnect?.error
      const boom = new Boom(error)
      const statusCode = boom.output?.statusCode
      const errorMessage = error?.message || boom.message || 'Sin mensaje'
      const errorData = error?.data ? JSON.stringify(error.data) : 'Sin data'
      const shouldReconnect = statusCode !== DisconnectReason.loggedOut

      console.error(`❌ [subbot ${numero}] Conexión cerrada | statusCode=${statusCode || 'N/A'} | message=${errorMessage} | data=${errorData} | shouldReconnect=${shouldReconnect}`)
      console.error(`🔍 [subbot ${numero}] Error completo:`, error)

      if (shouldReconnect) {
        setTimeout(() => startSubBot().catch((err) => console.error(`❌ [subbot ${numero}] Error reconectando:`, err)), 5000)
      }
    } else if (connection === 'open') {
      console.log(`✅ [subbot ${numero}] Conectado a WhatsApp. Identidad: ${sock.user?.id || 'desconocida'} | LID: ${sock.user?.lid || 'desconocido'}`)
      if (fs.existsSync(codeFilePath)) fs.unlink(codeFilePath, () => {})

      if (detenerHeartbeatSubbot) detenerHeartbeatSubbot()
      detenerHeartbeatSubbot = iniciarHeartbeat(numero)
    }
  })

  sock.ev.on('creds.update', saveCreds)

  sock.ev.on('messages.upsert', async ({ messages, type }) => {
    console.log(`📥 [subbot ${numero}] messages.upsert | tipo=${type} | cantidad=${messages?.length || 0}`)

    if (!messages?.length) return

    for (const msg of messages) {
      const key = msg.key || {}
      const jid = key.remoteJid || key.remoteJidAlt || ''
      const cuerpo = getMessageBody(msg)

      console.log(`📩 [subbot ${numero}] mensaje | fromMe=${!!key.fromMe} | remoteJid=${key.remoteJid || '-'} | remoteJidAlt=${key.remoteJidAlt || '-'} | participant=${key.participant || '-'} | participantAlt=${key.participantAlt || '-'} | texto=${cuerpo || '-'}`)

      if (!msg.message) {
        console.log(`⚠️ [subbot ${numero}] Mensaje sin contenido.`)
        continue
      }

      if (type !== 'notify') {
        console.log(`⏭️ [subbot ${numero}] Ignorado por tipo de evento: ${type}`)
        continue
      }

      if (!jid) {
        console.log(`⚠️ [subbot ${numero}] Mensaje sin JID.`)
        continue
      }

      const esGrupo = jid.endsWith('@g.us')

      if (esGrupo) {
        const puedeResponder = puedeResponderSubbot(numero, jid)
        console.log(`👥 [subbot ${numero}] Grupo ${jid} | puedeResponder=${puedeResponder}`)
        if (!puedeResponder) continue
      }

      const parsed = parseCommand(cuerpo, config)
      if (!parsed) {
        console.log(`ℹ️ [subbot ${numero}] No se detectó comando.`)
        continue
      }

      console.log(`🔎 [subbot ${numero}] Comando detectado: ${parsed.commandName} | args=${JSON.stringify(parsed.args)}`)

      const command = commands.get(parsed.commandName)
      if (!command) {
        console.log(`❓ [subbot ${numero}] Comando no encontrado: ${parsed.commandName}`)
        continue
      }

      if (command.ownerOnly) {
        const senderJids = [
          key.participantAlt,
          key.remoteJidAlt,
          key.participant,
          key.remoteJid,
        ].filter(Boolean)

        const identidadesPropias = obtenerIdentidadesPropias(sock, msg)
        const candidatosPropietario = [...identidadesPropias, ...senderJids].filter(Boolean)
        const esDueno = key.fromMe || esDuenoDeSubbot(numero, candidatosPropietario)
        const esOwnerPrincipal = senderJids.some((senderJid) => isOwner(senderJid, config))

        console.log(`🔐 [subbot ${numero}] ownerOnly=${command.ownerOnly} | fromMe=${!!key.fromMe} | candidatos=${JSON.stringify(candidatosPropietario)} | esDueno=${esDueno} | esOwnerPrincipal=${esOwnerPrincipal}`)

        if (!esOwnerPrincipal && !esDueno) {
          console.log(`⛔ [subbot ${numero}] Comando rechazado por comprobación de propietario: ${parsed.commandName}`)
          await sock.sendMessage(jid, { text: '⛔ Este comando es solo para el dueño de este subbot.' })
          continue
        }
      }

      try {
        console.log(`▶️ [subbot ${numero}] Ejecutando comando: ${parsed.commandName}`)
        await command.execute(sock, msg, parsed.args, { commands, categories, config, esSubBot: true, subbotNumero: numero })
        console.log(`✅ [subbot ${numero}] Comando ejecutado: ${parsed.commandName}`)
      } catch (err) {
        console.error(`❌ [subbot ${numero}] Error ejecutando "${parsed.commandName}":`, err)
        await sock.sendMessage(jid, { text: '⚠️ Ocurrió un error ejecutando ese comando.' })
      }
    }
  })
}

startSubBot().catch((err) => console.error(`❌ Error al iniciar subbot ${numero}:`, err))
