//CÓDIGO ORIGINAL DE YUIBOT-MD
const fs = require('fs')
const path = require('path')
const { escribirJSONAtomico } = require('../../lib/escrituraAtomica')

const RUTA_DB = path.join(__dirname, '..', '..', 'data', 'reportes.json')

function guardarReporte(reporte) {
  const carpeta = path.dirname(RUTA_DB)
  if (!fs.existsSync(carpeta)) fs.mkdirSync(carpeta, { recursive: true })

  let lista = []
  try {
    lista = JSON.parse(fs.readFileSync(RUTA_DB, 'utf-8'))
    if (!Array.isArray(lista)) lista = []
  } catch {
    lista = []
  }

  lista.push(reporte)
  escribirJSONAtomico(RUTA_DB, lista)
}

module.exports = {
  name: 'report',
  aliases: ['reportar', 'bug'],
  description: 'Reporta un error o problema del bot al owner',
  category: 'sistema',

  async execute(sock, msg, args, { config }) {
    const jid = msg.key.remoteJid
    const remitente = msg.key.participantAlt || msg.key.participant || jid
    const numeroRemitente = remitente.split('@')[0].split(':')[0]
    const detalle = args.join(' ').trim()

    if (!detalle) {
      return sock.sendMessage(jid, { text: '⚠️ Describe el problema.\nEjemplo: report el comando .sticker no funciona' }, { quoted: msg })
    }

    const reporte = { numero: numeroRemitente, detalle, fecha: new Date().toISOString() }
    guardarReporte(reporte)

    for (const owner of config.OWNERS) {
      try {
        await sock.sendMessage(`${owner.numero}@s.whatsapp.net`, {
          text: `🐛 *NUEVO REPORTE*\n\nDe: +${numeroRemitente}\n\n${detalle}`,
        })
      } catch (error) {
        console.error('[REPORT] No se pudo notificar al owner:', owner.numero, error)
      }
    }

    return sock.sendMessage(jid, { text: '✅ Reporte enviado. ¡Gracias por avisar!' }, { quoted: msg })
  },
}