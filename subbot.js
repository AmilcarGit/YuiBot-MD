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
const { getMessageBody, parseCommand, isOwner, obtenerCandidatosPropietario } = require('./lib/handler')
const { iniciarHeartbeat, puedeResponderSubbot } = require('./lib/red')
const { esDuenoDeSubbot, obtenerPrefijo } = require('./lib/subbots')
const { crearControladorReconexion } = require('./lib/reconexion')
const resiliencia = require('./lib/resiliencia')
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
let liberandoSocket = false

// Controlador de reconexión (backoff exponencial + cooldown ante 405),
// compartido con main.js vía lib/reconexion.js.
const controladorReconexion = crearControladorReconexion({
  etiqueta: `subbot ${numero}`,
  reiniciar: () => startSubBot(),
})

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

  const { commands, categories } = loadCommands()

  console.log(`🤖 [subbot ${numero}] Inicializado. Identidad: ${sock.user?.id || 'pendiente'} | LID: ${sock.user?.lid || 'pendiente'}`)

  if (!yaVinculado) {
    setTimeout(async () => {
      if (socketActivo !== sock || state.creds.registered) return

      const permiso = controladorReconexion.puedeIntentarPairing()
      if (!permiso.permitido) {
        const motivo = permiso.motivo === 'cooldown_405'
          ? `405 reciente, espera ~${Math.ceil((permiso.esperaMs || 0) / 60000)} min`
          : 'código pedido hace muy poco'
        console.warn(`⏳ [subbot ${numero}] No pedí el código todavía (${motivo}).`)
        return
      }

      controladorReconexion.marcarIntentoPairing()

      try {
        const code = await sock.requestPairingCode(numero.trim())
        if (socketActivo !== sock) return
        fs.writeFileSync(codeFilePath, code)
        console.log(`🔑 Código de vinculación para subbot ${numero}: ${code}`)
      } catch (err) {
        const statusCode = Number(err?.output?.statusCode || err?.data?.statusCode || 0)
        const mensaje = String(err?.message || err || '')
        if (statusCode === 405 || /\b405\b|method not allowed/i.test(mensaje)) {
          controladorReconexion.registrarPairing405()
        } else {
          console.error(`❌ [subbot ${numero}] No se pudo generar el código de vinculación:`, err)
        }
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
      const esLoggedOut = statusCode === DisconnectReason.loggedOut || statusCode === 401
      const esReemplazada = statusCode === DisconnectReason.connectionReplaced || statusCode === 440

      console.error(`❌ [subbot ${numero}] Conexión cerrada | statusCode=${statusCode || 'N/A'} | message=${errorMessage} | data=${errorData}`)

      if (esLoggedOut) {
        console.error(`❌ [subbot ${numero}] Sesión cerrada/inválida. No reconecto en bucle; hay que volver a vincular.`)
        return
      }

      if (esReemplazada) {
        console.error(`⚠️ [subbot ${numero}] La sesión fue reemplazada por otro dispositivo. No reconecto automáticamente.`)
        return
      }

      controladorReconexion.manejarCierre({ statusCode, mensaje: errorMessage })
    } else if (connection === 'open') {
      console.log(`✅ [subbot ${numero}] Conectado a WhatsApp. Identidad: ${sock.user?.id || 'desconocida'} | LID: ${sock.user?.lid || 'desconocido'}`)
      controladorReconexion.conexionExitosa()
      if (fs.existsSync(codeFilePath)) fs.unlink(codeFilePath, () => {})

      if (detenerHeartbeatSubbot) detenerHeartbeatSubbot()
      detenerHeartbeatSubbot = iniciarHeartbeat(numero)
    }
  })

  sock.ev.on('creds.update', saveCreds)

  sock.ev.on('messages.upsert', async ({ messages, type }) => {
    if (!messages?.length || type !== 'notify') return

    for (const msg of messages) {
      const key = msg.key || {}
      const jid = key.remoteJid || key.remoteJidAlt || ''
      const cuerpo = getMessageBody(msg)

      if (!msg.message) {
        console.log(`⚠️ [subbot ${numero}] Mensaje sin contenido.`)
        continue
      }

      if (!jid) {
        console.log(`⚠️ [subbot ${numero}] Mensaje sin JID.`)
        continue
      }

      if (key.fromMe) {
        console.log(`↩️ [subbot ${numero}] BOT → mensaje enviado`)
        continue
      }

      const esGrupo = jid.endsWith('@g.us')
      const tipoChat = esGrupo ? '👥 GRUPO' : '🔒 PRIVADO'
      const remitente = (key.participantAlt || key.participant || key.remoteJidAlt || key.remoteJid || '').split('@')[0]

      if (esGrupo) {
        const puedeResponder = puedeResponderSubbot(numero, jid)
        if (!puedeResponder) continue
      }

      const prefijoPersonalizado = obtenerPrefijo(numero)
      const configSubbot = prefijoPersonalizado
        ? { ...config, PREFIXES: [prefijoPersonalizado, ...config.PREFIXES.filter((p) => p !== prefijoPersonalizado)] }
        : config
      const parsed = parseCommand(cuerpo, configSubbot)

      if (!parsed) {
        console.log(`💬 [subbot ${numero}] ${tipoChat}\n   👤 ${remitente}\n   📝 ${cuerpo}\n   ℹ️ No se detectó comando`)
        console.log(`🔧 [subbot ${numero}] DEBUG | messages.upsert=${type} | remoteJid=${key.remoteJid || '-'} | participant=${key.participant || '-'} | fromMe=${!!key.fromMe} | puedeResponder=${esGrupo ? 'true' : 'N/A'} | ownerOnly=false`)
        continue
      }

      const command = commands.get(parsed.commandName)
      if (!command) {
        console.log(`⚡ [subbot ${numero}] ${tipoChat}\n   👤 ${remitente}\n   ❓ Comando no encontrado: ${parsed.commandName}`)
        console.log(`🔧 [subbot ${numero}] DEBUG | messages.upsert=${type} | remoteJid=${key.remoteJid || '-'} | participant=${key.participant || '-'} | fromMe=${!!key.fromMe} | puedeResponder=${esGrupo ? 'true' : 'N/A'} | ownerOnly=false`)
        continue
      }

      const estadoResiliencia = resiliencia.estaBloqueado(parsed.commandName)
      if (estadoResiliencia.bloqueado) {
        const minutos = Math.max(1, Math.ceil((estadoResiliencia.restanteMs || 0) / 60000))
        await sock.sendMessage(jid, { text: `⚠️ El comando *${parsed.commandName}* está temporalmente deshabilitado por fallos repetidos. Intenta en ~${minutos} min.` })
        continue
      }

      console.log(`╭─ ⚡ SUBBOT ${numero}\n│ ${tipoChat}\n│ 👤 ${remitente}\n│ ▶️ ${configSubbot.PREFIXES[0] || ''}${parsed.commandName}${parsed.args.length ? ` ${parsed.args.join(' ')}` : ''}`)

      if (command.ownerOnly) {
        const candidatosPropietario = obtenerCandidatosPropietario(sock, msg)
        const esDueno = key.fromMe || esDuenoDeSubbot(numero, candidatosPropietario)
        const esOwnerPrincipal = candidatosPropietario.some((senderJid) => isOwner(senderJid, config))

        if (!esOwnerPrincipal && !esDueno) {
          console.log(`⛔ [subbot ${numero}] ${parsed.commandName} → rechazado`)
          console.log(`🔧 [subbot ${numero}] DEBUG | messages.upsert=${type} | remoteJid=${key.remoteJid || '-'} | participant=${key.participant || '-'} | fromMe=${!!key.fromMe} | puedeResponder=${esGrupo ? 'true' : 'N/A'} | ownerOnly=true`)
          await sock.sendMessage(jid, { text: '⛔ Este comando es solo para el dueño de este subbot.' })
          continue
        }
      }

      try {
        await command.execute(sock, msg, parsed.args, { commands, categories, config: configSubbot, esSubBot: true, subbotNumero: numero })
        resiliencia.registrarExito(parsed.commandName)
        console.log(`│ ✅ ${parsed.commandName} → ejecutado\n╰────────────────────`)
      } catch (err) {
        resiliencia.registrarFallo(parsed.commandName, err)
        console.error(`❌ SUBBOT ${numero}\n   ${configSubbot.PREFIXES[0] || ''}${parsed.commandName} → error:`, err)
      }
    }
  })

  return sock
}

startSubBot().catch((err) => {
  liberarSocketUnico()
  console.error(`❌ Error al iniciar subbot ${numero}:`, err)
})