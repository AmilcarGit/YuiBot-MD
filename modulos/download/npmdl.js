const dw = require('../../lib/descargaWeb')
const { mensajeError } = require('../../lib/comandosDescarga')
const { uso, espera } = require('../../lib/estilo')

module.exports = {
  name: 'npmdl',
  aliases: ['npmpaquete', 'bajarnpm'],
  description: 'Descarga un paquete de npm (.tgz): .npmdl lodash@4.17.21',
  category: 'download',

  async execute(sock, msg, args, { config }) {
    const jid = msg.key.remoteJid
    const spec = (args[0] || '').trim()
    if (!spec) return sock.sendMessage(jid, { text: uso(config.PREFIXES[0], 'npmdl', 'lodash@4.17.21', 'Escribe el nombre del paquete (con versión opcional).') }, { quoted: msg })
    try {
      await sock.sendMessage(jid, { text: espera(`Buscando ${spec} en npm...`) }, { quoted: msg })
      const res = await dw.npm(spec)
      await dw.enviarResultado(sock, msg, jid, res, { sitioInfo: { emoji: '📦', nombre: 'npm' } })
    } catch (error) {
      console.error('[NPMDL]', error)
      await sock.sendMessage(jid, { text: mensajeError(error) }, { quoted: msg })
    }
  },
}
