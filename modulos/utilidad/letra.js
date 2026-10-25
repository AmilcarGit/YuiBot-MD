const delirius = require('../../lib/delirius')

const MAX_CARACTERES = 3500
const MAX_MENSAJES = 3

function partirTexto(texto, max = MAX_CARACTERES) {
  const partes = []
  let actual = ''
  for (const parrafo of texto.split(/\n{2,}/)) {
    if (actual && actual.length + parrafo.length + 2 > max) {
      partes.push(actual)
      actual = ''
    }
    actual += (actual ? '\n\n' : '') + parrafo
  }
  if (actual) partes.push(actual)
  return partes
}

module.exports = {
  name: 'letra',
  aliases: ['lyrics'],
  description: 'Busca la letra de una canción: .letra <canción o artista>',
  category: 'utilidad',

  async execute(sock, msg, args, { config }) {
    const jid = msg.key.remoteJid
    const prefijo = config.PREFIXES[0]
    const query = args.join(' ').trim()

    if (!query) {
      return sock.sendMessage(jid, { text: `❌ Escribe el nombre de la canción.\n\n📌 Ejemplo: ${prefijo}letra Monaco Bad Bunny` }, { quoted: msg })
    }

    try {
      const { titulo, duracion, letra } = await delirius.letra(query)
      const partes = partirTexto(letra)
      const mostradas = partes.slice(0, MAX_MENSAJES)

      for (let i = 0; i < mostradas.length; i++) {
        const cabecera = i === 0 ? `🎤 *${titulo}*${duracion ? `  ⏱️ ${duracion}` : ''}\n\n` : ''
        const pie = i === mostradas.length - 1 && partes.length > MAX_MENSAJES ? '\n\n… (letra recortada)' : ''
        await sock.sendMessage(jid, { text: cabecera + mostradas[i] + pie }, { quoted: msg })
      }
    } catch (error) {
      console.error('[LETRA]', error)
      await sock.sendMessage(jid, { text: `❌ No encontré la letra de "${query}".\n\n> ${error.message || 'Error desconocido'}\n\n💡 Prueba con "artista + canción".` }, { quoted: msg })
    }
  },

  _internos: { partirTexto },
}
