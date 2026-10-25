const fetch = require('../../lib/http').fetchSeguro
const publicas = require('../../lib/publicas')

module.exports = {
  name: 'anime',
  aliases: ['animeinfo', 'myanimelist'],
  description: 'Información de un anime (MyAnimeList): .anime <nombre>',
  category: 'diversion',

  async execute(sock, msg, args, { config }) {
    const jid = msg.key.remoteJid
    const consulta = args.join(' ').trim()
    if (!consulta) {
      return sock.sendMessage(jid, { text: `❌ Escribe el nombre del anime.\n\n📌 Ejemplo: ${config.PREFIXES[0]}anime Naruto` }, { quoted: msg })
    }

    try {
      const a = await publicas.anime(consulta)
      const sinopsis = a.sinopsis.length > 500 ? a.sinopsis.slice(0, 497).trimEnd() + '…' : a.sinopsis
      const caption =
        `╭━━━〔 🎌 ANIME 〕━━━╮\n` +
        `┃ 📺 ${a.titulo}\n` +
        (a.tituloOriginal && a.tituloOriginal !== a.titulo ? `┃ 🈶 ${a.tituloOriginal}\n` : '') +
        `┃ 🎞️ ${a.tipo || '—'} · ${a.episodios ?? '?'} episodios · ${a.estado || '—'}\n` +
        `┃ ⭐ ${a.puntuacion ?? '—'}${a.ranking ? `  🏆 #${a.ranking}` : ''}${a.anio ? `  📅 ${a.anio}` : ''}\n` +
        `┃ 🏷️ ${a.generos.join(', ') || '—'}\n` +
        `╰━━━━━━━━━━━━━━━━━━━━╯\n\n` +
        `${sinopsis}\n\n🔗 ${a.url}`

      if (a.imagen) {
        const img = await fetch(a.imagen)
        if (img.ok) return sock.sendMessage(jid, { image: Buffer.from(await img.arrayBuffer()), caption }, { quoted: msg })
      }
      await sock.sendMessage(jid, { text: caption }, { quoted: msg })
    } catch (error) {
      const texto = error.noEncontrado ? `❌ No encontré ningún anime llamado "${consulta}".` : `❌ No se pudo consultar el anime.\n\n> ${error.message}`
      await sock.sendMessage(jid, { text: texto }, { quoted: msg })
    }
  },
}
