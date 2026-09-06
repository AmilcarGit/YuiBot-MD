//CÓDIGO ORIGINAL DE YUIBOT-MD
const crypto = require('crypto')

module.exports = {
  name: 'hash',
  description: 'Genera hashes criptográficos de un texto',
  category: 'herramientas',
  async execute(sock, msg, args) {
    const jid = msg.key.remoteJid
    const texto = args.join(' ')
    const algoritmo = (args[0] || '').toLowerCase()
    const disponibles = ['md5', 'sha1', 'sha256', 'sha512']
    const metodo = disponibles.includes(algoritmo) ? algoritmo : 'sha256'
    const contenido = disponibles.includes(algoritmo) ? args.slice(1).join(' ') : texto
    if (!contenido) return sock.sendMessage(jid, { text: '❌ Usa: *hash texto* o *hash sha256 texto*\nDisponibles: md5, sha1, sha256, sha512' }, { quoted: msg })
    const resultado = crypto.createHash(metodo).update(contenido, 'utf8').digest('hex')
    await sock.sendMessage(jid, { text: `╭─ ✦ 🔐 HASH ✦
│ 🔧 Algoritmo: *${metodo.toUpperCase()}*
│ 📝 Texto: *${contenido}*
│ 🔑 Resultado:
│ ${resultado}
╰─ 🍃 YuiBot-MD` }, { quoted: msg })
  },
}
