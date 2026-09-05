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
const { esDuenoDeSubbot, obtenerPrefijo } = require('./lib/subbots')
const config = require('./defaults')

const numero = process.argv[2]

if (!numero) {
  console.error('❌ Debes indicar el número del subbot. Uso: node subbot.js <numero>')
  process.exit(1)
}

const carpetaSubbot = path.join(__dirname, 'subbots', numero)
const sessionPath = path.join(carpetaSubbot, 'session')
const codeFilePath = path.join(carpetaSubbot, 'code.txt')
const socketLockPath = path.join(carpetaSubbot, 'socket.lock')

fs.mkdirSync(sessionPath, { recursive: true })

let detenerHeartbeatSubbot = null
let socketActivo = null
let reconexionProgramada = false
let liberandoSocket = false

function obtenerPidDelLock() {
  try {
    return Number(fs.readFileSync(socketLockPath, 'utf-8').trim())
  } catch {
    return null
  }
}

function procesoActivo(pid) {
  if (!pid || !Number.isInteger(pid)) return false
  try {
    process.kill(pid, 0)
    return true
  } catch {
    return false
  }
}

function adquirirSocketUnico() {
  try {
    const fd = fs.openSync(socketLockPath, 'wx')
    fs.writeFileSync(fd, String(process.pid))
    fs.closeSync(fd)
    return true
  } catch (error) {
    if (error.code !== 'EEXIST') throw error

    const pidAnterior = obtenerPidDelLock()
    if (procesoActivo(pidAnterior)) {
      console.error(`❌ [subbot ${numero}] Ya existe un socket activo para este subbot (PID ${pidAnterior}).`)
      return false
    }

    try {
      fs.unlinkSync(socketLockPath)
      const fd = fs.openSync(socketLockPath, 'wx')
      fs.writeFileSync(fd, String(process.pid))
      fs.closeSync(fd)
      return true
    } catch {
      console.error(`❌ [subbot ${numero}] No se pudo tomar el control exclusivo del socket.`)
      return false
    }
  }
}

function liberarSocketUnico() {
  if (liberandoSocket) return
  liberandoSocket = true

  try {
    const pid = obtenerPidDelLock()
    if (pid === process.pid && fs.existsSync(socketLockPath)) {
      fs.unlinkSync(socketLockPath)
    }
  } catch {}
}

if (!adquirirSocketUnico()) process.exit(1)

process.once('exit', liberarSocketUnico)
process.once('SIGINT', () => {
  liberarSocketUnico()
  process.exit(0)
})
process.once('SIGTERM', () => {
  liberarSocketUnico()
  process.exit(0)
})

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
  if (socketActivo) return socketActivo

  const { state, saveCreds } = await useMultiFileAuthState(sessionPath)
  const { version } = await fetchLatestBaileysVersion()

  const yaVinculado = state.creds.registered

  const sock = makeWASocket({
    version,
    auth: state,
    logger: pino({ level: 'silent' }),
    printQRInTerminal: false,
  })

  socketActivo = sock
  reconexionProgramada = false

  const { commands, categories } = loadCommands()

  console.log(`🤖 [subbot ${numero}] Inicializado. Identidad: ${sock.user?.id || 'pendiente'} | LID: ${sock.user?.lid || 'pendiente'}`)

  if (!yaVinculado) {
    setTimeout(async () => {
      if (socketActivo !== sock || state.creds.registered) return

      try {
        const code = await sock.requestPairingCode(numero.trim())
        if (socketActivo !== sock) return
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
      if (socketActivo === sock) socketActivo = null

      const error = lastDisconnect?.error
      const boom = new Boom(error)
      const statusCode = boom.output?.statusCode
      const errorMessage = error?.message || boom.message || 'Sin mensaje'
      const errorData = error?.data ? JSON.stringify(error.data) : 'Sin data'
      const shouldReconnect = statusCode !== DisconnectReason.loggedOut

      console.error(`❌ [subbot ${numero}] Conexión cerrada | statusCode=${statusCode || 'N/A'} | message=${errorMessage} | data=${errorData} | shouldReconnect=${shouldReconnect}`)
      console.error(`🔍 [subbot ${numero}] Error completo:`, error)

      if (shouldReconnect && !reconexionProgramada) {
        reconexionProgramada = true
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

      const prefijoPersonalizado = obtenerPrefijo(numero)
      const configSubbot = prefijoPersonalizado
        ? { ...config, PREFIXES: [prefijoPersonalizado, ...config.PREFIXES.filter((p) => p !== prefijoPersonalizado)] }
        : config
      const parsed = parseCommand(cuerpo, configSubbot)
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
        await command.execute(sock, msg, parsed.args, { commands, categories, config: configSubbot, esSubBot: true, subbotNumero: numero })
        console.log(`✅ [subbot ${numero}] Comando ejecutado: ${parsed.commandName}`)
      } catch (err) {
        console.error(`❌ [subbot ${numero}] Error ejecutando "${parsed.commandName}":`, err)
        await sock.sendMessage(jid, { text: '⚠️ Ocurrió un error ejecutando ese comando.' })
      }
    }
  })

  return sock
}

startSubBot().catch((err) => {
  liberarSocketUnico()
  console.error(`❌ Error al iniciar subbot ${numero}:`, err)
})
