//CÓDIGO ORIGINAL DE YUIBOT-MD
module.exports = {
  name: 'json',
  description: 'Valida y formatea JSON',
  category: 'herramientas',
  async execute(sock, msg, args) {
    const jid = msg.key.remoteJid
    const texto = args.join(' ').trim()
    if (!texto) return sock.sendMessage(jid, { text: '❌ Escribe un JSON.\nEjemplo: *json {"nombre":"Yui"}*' }, { quoted: msg })
    try {
      const data = JSON.parse(texto)
      const salida = JSON.stringify(data, null, 2)
      if (salida.length > 3500) return sock.sendMessage(jid, { text: `✅ JSON válido.\n📦 Tamaño formateado: *${salida.length} caracteres*\n⚠️ Es demasiado largo para mostrarlo completo.` }, { quoted: msg })
      await sock.sendMessage(jid, { text: `╭─ ✦ 📦 JSON ✦
│ ✅ JSON válido
│ 📏 Caracteres: *${salida.length}*
╰─ 🍃 YuiBot-MD

\`\`\`json
${salida}
\`\`\`` }, { quoted: msg })
    } catch (error) {
      await sock.sendMessage(jid, { text: `❌ JSON inválido.\n📍 ${error.message}` }, { quoted: msg })
    }
  },
}
