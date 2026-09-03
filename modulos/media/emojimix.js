//CÓDIGO ORIGINAL DE YUIBOT-MD
const { crearStickerWebp } = require('../../lib/stickers')

const TENOR_KEY = 'AIzaSyAyimkuYQYF_FXVALexPuGQctUWRURdCYQ'

module.exports = {
  name: 'emojimix',
  aliases: ['combinaremojis'],
  description: 'Combina 2 emojis en un sticker (ej: !emojimix 😀+😂)',
  category: 'media',

  async execute(sock, msg, args, { config }) {
    const jid = msg.key.remoteJid
    const prefijo = config.PREFIXES[0]
    const texto = args.join(' ').trim()

    const partes = texto.split('+').map((e) => e.trim()).filter(Boolean)

    if (partes.length !== 2) {
      return sock.sendMessage(
        jid,
        { text: `❌ Usa dos emojis separados por "+".\n📌 Ejemplo: ${prefijo}emojimix 😀+😂` },
        { quoted: msg }
      )
    }

    const [emoji1, emoji2] = partes

    try {
      const url = `https://tenor.googleapis.com/v2/featured?key=${TENOR_KEY}&contentfilter=high&media_filter=png_transparent&component=proactive&collection=emoji_kitchen_v5&q=${encodeURIComponent(emoji1)}_${encodeURIComponent(emoji2)}`
      const respuesta = await fetch(url)
      const datos = await respuesta.json()

      const resultado = datos?.results?.[0]
      if (!resultado) {
        return sock.sendMessage(
          jid,
          { text: '❌ Esa combinación de emojis no existe. Prueba con otros.' },
          { quoted: msg }
        )
      }

      const imagenUrl =
        resultado.url ||
        resultado.media_formats?.png_transparent?.url ||
        resultado.media?.[0]?.png_transparent?.url

      if (!imagenUrl) {
        return sock.sendMessage(jid, { text: '❌ No se pudo obtener la imagen combinada.' }, { quoted: msg })
      }

      const respuestaImagen = await fetch(imagenUrl)
      const buffer = Buffer.from(await respuestaImagen.arrayBuffer())

      const sticker = await crearStickerWebp(buffer, { animado: false, config, extensionEntrada: 'png' })

      await sock.sendMessage(jid, { sticker }, { quoted: msg })
    } catch (error) {
      console.error('[EMOJIMIX] Error:', error)
      await sock.sendMessage(jid, { text: '⚠️ Ocurrió un error generando el emojimix.' }, { quoted: msg })
    }
  },
}