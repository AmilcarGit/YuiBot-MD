const dw = require('../../lib/descargaWeb')
const { mensajeError } = require('../../lib/comandosDescarga')
const { caja, uso } = require('../../lib/estilo')
const { reaccionar } = require('../../lib/reaccion')

const LIMITE_CHAT = 1500

module.exports = {
  name: 'webtext',
  aliases: ['leerweb', 'textoweb'],
  description: 'Extrae el texto legible de una página o artículo: .webtext <enlace>',
  category: 'download',

  async execute(sock, msg, args, { config }) {
    const jid = msg.key.remoteJid
    const entrada = dw.extraerUrl(args.join(' ')) || args[0]
    const url = entrada && dw.urlSegura(entrada)
    if (!url) return sock.sendMessage(jid, { text: uso(config.PREFIXES[0], 'webtext', 'https://es.wikipedia.org/wiki/WhatsApp', 'Envía el enlace de una página pública.') }, { quoted: msg })
    try {
      await reaccionar(sock, msg, '⏳')
      const { titulo, texto } = await dw.webtext(url)
      const corto = texto.length > LIMITE_CHAT ? `${texto.slice(0, LIMITE_CHAT).replace(/\s+\S*$/, '')}…` : texto
      await sock.sendMessage(jid, { text: `${caja('📰', 'Texto de la página', [['Título', titulo.slice(0, 100), '📝'], ['Largo', `${texto.length} caracteres`, '🔤']], url)}\n\n${corto}` }, { quoted: msg })
      if (texto.length > LIMITE_CHAT) {
        await sock.sendMessage(jid, { document: Buffer.from(`${titulo}\n${url}\n\n${texto}`, 'utf8'), mimetype: 'text/plain', fileName: 'pagina.txt', caption: '📄 Texto completo' }, { quoted: msg })
      }
    } catch (error) {
      await reaccionar(sock, msg, '❌')
      console.error('[WEBTEXT]', error)
      await sock.sendMessage(jid, { text: mensajeError(error) }, { quoted: msg })
    }
  },
}
