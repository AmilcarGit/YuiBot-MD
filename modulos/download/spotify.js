const fetch = require('../../lib/http').fetchSeguro
const delirius = require('../../lib/delirius')
const { caja, espera, uso } = require('../../lib/estilo')
const { pedirBusqueda, obtenerAudio } = require('../../lib/youtube')

module.exports = {
  name: 'spotify',
  aliases: ['sp', 'spoti'],
  description: 'Busca una canción en Spotify y envía el audio: .spotify <canción>',
  category: 'download',

  async execute(sock, msg, args, { config }) {
    const jid = msg.key.remoteJid
    const prefijo = config.PREFIXES[0]
    const query = args.join(' ').trim()

    if (!query) {
      return sock.sendMessage(jid, { text: uso(prefijo, 'spotify', 'Monaco Bad Bunny', 'Escribe el nombre de la canción.') }, { quoted: msg })
    }

    try {
      const [cancion] = await delirius.buscarSpotify(query)

      const caption = caja('🟢', 'Spotify', [
        ['Título', String(cancion.titulo || 'Sin título').slice(0, 150), '🎵'],
        ['Artista', cancion.artista || 'Desconocido', '👤'],
        ['Álbum', cancion.album || '—', '💿'],
        ['Duración', cancion.duracion || '—', '⏱️'],
        ['Publicado', cancion.publicado || '—', '📅'],
      ], espera('Preparando el audio...'))

      try {
        if (!cancion.imagen) throw new Error('sin portada')
        const portada = await fetch(cancion.imagen)
        if (!portada.ok) throw new Error(`HTTP ${portada.status}`)
        await sock.sendMessage(jid, { image: Buffer.from(await portada.arrayBuffer()), caption }, { quoted: msg })
      } catch {
        await sock.sendMessage(jid, { text: caption }, { quoted: msg })
      }

      // Spotify no entrega audio: se busca la canción en YouTube y se descarga de ahí.
      const busqueda = await pedirBusqueda(`${cancion.artista || ''} ${cancion.titulo}`.trim())
      const video = busqueda?.datos?.results?.videos?.[0]
      if (!video?.url) throw new Error('No encontré el audio de esa canción')

      const audio = await obtenerAudio(video.url)
      const nombre = `${cancion.artista ? cancion.artista + ' - ' : ''}${cancion.titulo}`.replace(/[\\/:*?"<>|]/g, '_')
      await sock.sendMessage(jid, { audio: audio.buffer, mimetype: 'audio/mpeg', fileName: `${nombre}.mp3`, ptt: false }, { quoted: msg })
    } catch (error) {
      console.error('[SPOTIFY]', error)
      await sock.sendMessage(jid, { text: `❌ No se pudo obtener la canción.\n\n> ${error.message || 'Error desconocido'}` }, { quoted: msg })
    }
  },
}
