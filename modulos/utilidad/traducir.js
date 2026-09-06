//CÓDIGO ORIGINAL DE YUIBOT-MD
module.exports = {
  name: 'traducir',
  aliases: [],
  description: 'Traduce texto entre idiomas',
  category: 'utilidad',
  async execute(sock, msg, args) {
    const jid = msg.key.remoteJid
    if (args.length < 2) return sock.sendMessage(jid, { text: '❌ Usa: *traducir es-en Hola, cómo estás*' }, { quoted: msg })
    const par = args[0]
    const texto = args.slice(1).join(' ')
    if (!/^[a-z]{2}-[a-z]{2}$/i.test(par)) return sock.sendMessage(jid, { text: '❌ El formato debe ser *origen-destino*, por ejemplo *es-en*.' }, { quoted: msg })
    const [origen, destino] = par.toLowerCase().split('-')
    try {
      const respuesta = await fetch(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(texto)}&langpair=${origen}|${destino}`)
      if (!respuesta.ok) throw new Error(`HTTP ${respuesta.status}`)
      const data = await respuesta.json()
      const traduccion = data?.responseData?.translatedText
      if (!traduccion) throw new Error('No se obtuvo una traducción.')
      await sock.sendMessage(jid, { text: `╭─ ✦ 🌐 TRADUCIR ✦\n│ 🔤 Idiomas: *${origen} → ${destino}*\n│ 📝 Original: *${texto}*\n│ ✅ Traducción: *${traduccion}*\n╰─ 🍃 YuiBot-MD` }, { quoted: msg })
    } catch (error) {
      await sock.sendMessage(jid, { text: `❌ No se pudo traducir: ${error.message}` }, { quoted: msg })
    }
  },
}