const fetch = require('../../lib/http').fetchSeguro
const publicas = require('../../lib/publicas')

const { caja, uso } = require('../../lib/estilo')

module.exports = {
  name: 'anime',
  aliases: ['animeinfo', 'myanimelist'],
  description: 'Información de un anime (MyAnimeList): .anime <nombre>',
  category: 'diversion',

  async execute(sock, msg, args, { config }) {
    const jid = msg.key.remoteJid
    const consulta = args.join(' ').trim()
    if (!consulta) {
      return sock.sendMessage(jid, { text: uso(config.PREFIXES[0], 'anime', 'Naruto', 'Escribe el nombre del anime.') }, { quoted: msg })
    }

    try {
      const a = await publicas.anime(consulta)
      const sinopsis = a.sinopsis.length > 500 ? a.sinopsis.slice(0, 497).trimEnd() + '…' : a.sinopsis
      const caption =
        caja('🎌', 'Anime', [
          ['Título', a.titulo, '📺'],
          a.tituloOriginal && a.tituloOriginal !== a.titulo ? ['Original', a.tituloOriginal, '🈶'] : null,
          ['Tipo', a.tipo || '—', '🎞️'],
          ['Episodios', a.episodios ?? '?', '📼'],
          ['Estado', a.estado || '—', '📡'],
          ['Puntuación', a.puntuacion ?? '—', '⭐'],
          a.ranking ? ['Ranking', `#${a.ranking}`, '🏆'] : null,
          a.anio ? ['Año', a.anio, '📅'] : null,
          ['Géneros', a.generos.join(', ') || '—', '🏷️'],
        ]) +
        `\n\n${sinopsis}\n\n🔗 ${a.url}`

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
