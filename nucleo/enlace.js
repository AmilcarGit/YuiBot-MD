// Código Oficial de YuiBot-MD.by AmilcarGit
import makeWASocket, { useMultiFileAuthState, DisconnectReason } from 'yui-bails'
import pino from 'pino'
import fs from 'fs'
import ajustes from '../ajustes.js'
import { procesar } from './cerebro.js'
import { eventosGrupo } from './grupos.js'

const registro = pino({ level: 'silent' })

export async function conectar(opciones) {
  const { carpeta, numero = null, qr = false, alCodigo, alError, alAbrir, alSalir } = opciones

  fs.mkdirSync(carpeta, { recursive: true })
  const { state, saveCreds } = await useMultiFileAuthState(carpeta)

  const sock = makeWASocket({
    auth: state,
    logger: registro,
    browser: ['Ubuntu', 'Chrome', '22.04.4'],
    printQRInTerminal: qr,
    markOnlineOnConnect: false
  })

  if (!state.creds.registered && numero) {
    setTimeout(async () => {
      try {
        const codigo = await sock.requestPairingCode(numero)
        console.log(`Código de vinculación (${numero}): ${codigo}`)
        alCodigo?.(codigo)
      } catch (error) {
        console.error(error.message)
        alError?.(error)
      }
    }, 3000)
  }

  const terminar = () => (alSalir ? alSalir() : process.exit(1))

  sock.ev.on('creds.update', saveCreds)
  sock.ev.on('messages.upsert', evento => procesar(sock, evento))
  sock.ev.on('group-participants.update', evento => eventosGrupo(sock, evento).catch(() => {}))

  sock.ev.on('connection.update', ({ connection, lastDisconnect }) => {
    if (connection === 'open') {
      console.log(`${ajustes.nombre} conectado (${carpeta})`)
      alAbrir?.(sock)
      return
    }
    if (connection !== 'close') return

    const codigo = lastDisconnect?.error?.output?.statusCode

    if (codigo === DisconnectReason.loggedOut) {
      fs.rmSync(carpeta, { recursive: true, force: true })
      return terminar()
    }
    if (codigo === DisconnectReason.connectionReplaced) return terminar()

    setTimeout(() => {
      conectar(opciones).catch(error => console.error(error.message))
    }, 3000)
  })

  return sock
}
