// Fábrica de comandos de descarga por enlace (.twitter, .reddit, .mediafire…) y flujo común.
const dw = require('./descargaWeb')
const { uso } = require('./estilo')
const { conReaccion } = require('./reaccion')

const SITIO = (clave) => dw.SITIOS.find((s) => s.clave === clave)
const mensajeError = (e) => `❌ No pude descargarlo.\n\n> ${String(e?.message || 'Error desconocido').slice(0, 220)}`

/** Descarga `url` de un sitio manejado por descargaWeb y lo envía. */
async function descargarYEnviar(sock, msg, clave, url, tipo = 'video') {
  const jid = msg.key.remoteJid
  const info = SITIO(clave)
  try {
    await conReaccion(sock, msg, async () => {
      const res = await dw.descargar(clave, url, tipo)
      await dw.enviarResultado(sock, msg, jid, res, { sitioInfo: info })
    })
  } catch (error) {
    console.error(`[${clave.toUpperCase()}]`, error)
    await sock.sendMessage(jid, { text: mensajeError(error) }, { quoted: msg })
  }
}

function crearComandoDescarga({ name, aliases = [], description, sitio, ejemplo }) {
  const info = SITIO(sitio)
  return {
    name, aliases, description, category: 'download',
    async execute(sock, msg, args, { config }) {
      const jid = msg.key.remoteJid
      const P = config.PREFIXES[0]
      const url = dw.extraerUrl(args.join(' ')) || dw.extraerUrl(msg.message?.extendedTextMessage?.contextInfo?.quotedMessage?.conversation)
      if (!url) return sock.sendMessage(jid, { text: uso(P, name, ejemplo, `Envía un enlace de ${info.nombre} (o responde a un mensaje que lo tenga).`) }, { quoted: msg })
      if (dw.detectarSitio(url)?.clave !== sitio) return sock.sendMessage(jid, { text: `❌ Ese enlace no parece ser de ${info.nombre}.` }, { quoted: msg })
      const audio = args.some((a) => ['audio', 'mp3'].includes(a.toLowerCase()))
      return descargarYEnviar(sock, msg, sitio, url, audio ? 'audio' : 'video')
    },
  }
}

module.exports = { crearComandoDescarga, descargarYEnviar, mensajeError }
