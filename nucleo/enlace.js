// Código Oficial de YuiBot-MD.by AmilcarGit
import makeWASocket, { useMultiFileAuthState, DisconnectReason } from '@yui-bails/baileys'
import pino from 'pino'
import fs from 'fs'
import ajustes from '../ajustes.js'
import { procesar } from './cerebro.js'
import { eventosGrupo } from './grupos.js'

const registro = pino({ level: 'silent' })
const MAX_CODIGOS = 3

export async function conectar(opciones) {
  const { carpeta, numero = null, qr = false, alCodigo, alError, alAbrir, alSalir } = opciones
  // Se conserva entre reconexiones porque `opciones` es el mismo objeto.
  const estado = (opciones.estado ??= { intentos: 0, codigos: 0 })

  fs.mkdirSync(carpeta, { recursive: true })
  const { state, saveCreds } = await useMultiFileAuthState(carpeta)

  // Un sub-bot que nunca se vincula no debe pedir códigos para siempre (cada uno llega al teléfono).
  if (alSalir && numero && !state.creds.registered && estado.codigos >= MAX_CODIGOS) {
    fs.rmSync(carpeta, { recursive: true, force: true })
    alError?.(new Error('No se completó la vinculación. Pide un código nuevo.'))
    return alSalir()
  }

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
        estado.codigos++
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
      estado.intentos = 0
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

    // Tras vincular, WhatsApp pide reiniciar la conexión al instante; el resto de fallos espera más cada vez.
    const reinicio = codigo === DisconnectReason.restartRequired
    const espera = reinicio ? 500 : Math.min(3000 * 2 ** estado.intentos++, 60000)
    setTimeout(() => {
      conectar(opciones).catch(error => console.error(error.message))
    }, espera)
  })

  return sock
}
