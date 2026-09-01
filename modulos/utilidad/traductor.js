//CÓDIGO ORIGINAL DE YUIBOT-MD
module.exports = {
  name: 'traductor',
  aliases: ['translate', 'tr'],
  description: 'Traduce texto entre idiomas',
  category: 'utilidad',

  async execute(sock, msg, args, { config }) {
    const jid = msg.key.remoteJid
    const prefijo = config.PREFIXES[0]

    if (args.length < 2) {
      return sock.sendMessage(
        jid,
        {
          text:
            `❌ Escribe el par de idiomas y el texto.\n\n` +
            `📌 Ejemplo: ${prefijo}traductor es-en Hola, cómo estás\n` +
            `📌 Ejemplo: ${prefijo}traductor en-es Hello, how are you`
        },
        { quoted: msg }
      )
    }

    const parIdiomas = args[0]
    const texto = args.slice(1).join(' ')

    if (!/^[a-z]{2}-[a-z]{2}$/i.test(parIdiomas)) {
      return sock.sendMessage(
        jid,
        { text: `❌ El par de idiomas debe tener el formato "origen-destino", ej: es-en, en-es, es-fr.` },
        { quoted: msg }
      )
    }

    const [origen, destino] = parIdiomas.toLowerCase().split('-')

    try {
      const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(texto)}&langpair=${origen}|${destino}`
      const resp = await fetch(url)
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`)

      const data = await resp.json()
      const traduccion = data?.responseData?.translatedText

      if (!traduccion) throw new Error('No se pudo traducir el texto')

      const textoRespuesta =
        `⛧───「 Traducción (${origen} → ${destino}) 」───⛧\n\n` +
        `${traduccion}\n\n` +
        `╰─➤ _${config.BOT_NAME}_ 🥀`

      await sock.sendMessage(jid, { text: textoRespuesta }, { quoted: msg })
    } catch (error) {
      console.error('[TRADUCTOR]', error)
      await sock.sendMessage(
        jid,
        { text: `❌ No se pudo traducir el texto.\n\n> ${error.message || 'Error desconocido'}` },
        { quoted: msg }
      )
    }
  },
}