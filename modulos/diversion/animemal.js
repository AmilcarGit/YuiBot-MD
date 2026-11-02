const { enviar, delirius, caja, uso, recortar } = require('../../lib/perfilesDelirius')

module.exports = {
  name: 'animemal',
  aliases: ['buscaranime', 'animes', 'malsearch'],
  description: 'Busca animes en MyAnimeList (lista de resultados): .animemal <nombre>',
  category: 'diversion',

  async execute(sock, msg, args, { config }) {
    const jid = msg.key.remoteJid
    const consulta = args.join(' ').trim()
    if (!consulta) return sock.sendMessage(jid, { text: uso(config.PREFIXES[0], 'animemal', 'Naruto', 'Escribe qué anime buscar.') }, { quoted: msg })

    try {
      const lista = (await delirius.buscarAnimeMAL(consulta)).slice(0, 8)
      const texto = caja('🎌', 'MyAnimeList', lista.map((a, i) =>
        `${i + 1}. *${recortar(a.nombre, 60)}*\n   📺 ${a.formato || '—'} · 📅 ${a.anio || '—'} · ⭐ ${a.puntuacion || '—'}\n   📡 ${a.estado || '—'}\n   🔗 ${a.url}`),
      `${lista.length} resultados para "${recortar(consulta, 30)}" · detalles: ${config.PREFIXES[0]}anime <nombre>`)
      await enviar(sock, msg, lista[0]?.imagen, texto)
    } catch (error) {
      console.error('[ANIMEMAL]', error)
      await sock.sendMessage(jid, { text: `❌ No encontré animes para "${consulta}".\n\n> ${error.message}` }, { quoted: msg })
    }
  },
}
