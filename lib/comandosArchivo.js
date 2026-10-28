// Fábrica de comandos que bajan un archivo por enlace (mediafire, gdrive, mega).
const dw = require('./descargaWeb')
const { descargarYEnviar } = require('./comandosDescarga')
const { uso } = require('./estilo')

function crearComandoArchivo({ name, aliases = [], description, sitio, ejemplo }) {
  const info = dw.SITIOS.find((s) => s.clave === sitio)
  return {
    name, aliases, description, category: 'download',
    async execute(sock, msg, args, { config }) {
      const jid = msg.key.remoteJid
      const url = dw.extraerUrl(args.join(' ')) || dw.extraerUrl(msg.message?.extendedTextMessage?.contextInfo?.quotedMessage?.conversation)
      if (!url) return sock.sendMessage(jid, { text: uso(config.PREFIXES[0], name, ejemplo, `Envía un enlace de ${info.nombre}.`) }, { quoted: msg })
      if (dw.detectarSitio(url)?.clave !== sitio) return sock.sendMessage(jid, { text: `❌ Ese enlace no parece ser de ${info.nombre}.` }, { quoted: msg })
      return descargarYEnviar(sock, msg, sitio, url)
    },
  }
}

module.exports = { crearComandoArchivo }
