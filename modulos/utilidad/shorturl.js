//CÓDIGO ORIGINAL DE YUIBOT-MD
const fetch = require('../../lib/http').fetchSeguro // timeout por defecto (ver lib/http.js)
module.exports = {
  name: 'shorturl',
  aliases: [],
  description: 'Acorta un enlace',
  category: 'utilidad',
  async execute(sock, msg, args) {
    const jid = msg.key.remoteJid
    const url = args[0]
    if (!url || !/^https?:\/\//i.test(url)) return sock.sendMessage(jid, { text: '❌ Usa: *shorturl https://ejemplo.com*' }, { quoted: msg })

    try {
      const respuesta = await fetch(`https://tinyurl.com/api-create.php?url=${encodeURIComponent(url)}`)
      if (!respuesta.ok) throw new Error(`HTTP ${respuesta.status}`)
      const corto = (await respuesta.text()).trim()
      if (!/^https?:\/\//i.test(corto)) throw new Error('El servicio no devolvió un enlace válido.')
      await sock.sendMessage(jid, { text: `╭─ ✦ 🔗 SHORTURL ✦\n│ 🔗 Original: *${url}*\n│ ✨ Corto: *${corto}*\n╰─ 🍃 YuiBot-MD` }, { quoted: msg })
    } catch (error) {
      await sock.sendMessage(jid, { text: `❌ No se pudo acortar el enlace: ${error.message}` }, { quoted: msg })
    }
  },
}