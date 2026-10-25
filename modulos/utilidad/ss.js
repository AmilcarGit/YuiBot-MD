const fetch = require('../../lib/http').fetchSeguro
const delirius = require('../../lib/delirius')

function normalizarUrl(texto) {
  const limpio = String(texto || '').trim()
  if (!limpio) return null
  const conEsquema = /^https?:\/\//i.test(limpio) ? limpio : `https://${limpio}`
  try {
    const url = new URL(conEsquema)
    return url.hostname.includes('.') ? url.toString() : null
  } catch {
    return null
  }
}

module.exports = {
  name: 'ss',
  aliases: ['ssweb', 'captura', 'screenshot'],
  description: 'Captura de pantalla de una página web: .ss <enlace>',
  category: 'utilidad',

  async execute(sock, msg, args, { config }) {
    const jid = msg.key.remoteJid
    const prefijo = config.PREFIXES[0]
    const url = normalizarUrl(args.join(' '))

    if (!url) {
      return sock.sendMessage(jid, { text: `❌ Escribe un enlace válido.\n\n📌 Ejemplo: ${prefijo}ss https://google.com` }, { quoted: msg })
    }

    try {
      await sock.sendMessage(jid, { text: `📸 Tomando captura de ${url} ...` }, { quoted: msg })
      const imagen = await delirius.captura(url)
      const respuesta = await fetch(imagen)
      if (!respuesta.ok) throw new Error(`No se pudo obtener la imagen (HTTP ${respuesta.status})`)
      const buffer = Buffer.from(await respuesta.arrayBuffer())
      await sock.sendMessage(jid, { image: buffer, caption: `🖥️ ${url}` }, { quoted: msg })
    } catch (error) {
      console.error('[SS]', error)
      await sock.sendMessage(jid, { text: `❌ No se pudo tomar la captura.\n\n> ${error.message || 'Error desconocido'}` }, { quoted: msg })
    }
  },

  _internos: { normalizarUrl },
}
