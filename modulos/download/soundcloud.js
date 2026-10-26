const fetch = require('../../lib/http').fetchSeguro
const delirius = require('../../lib/delirius')
const { caja, espera, uso } = require('../../lib/estilo')
const { descargarLocal, ytDlpDisponible } = require('../../lib/youtube')

module.exports = {
  name: 'soundcloud',
  aliases: ['sc', 'scdl'],
  description: 'Busca en SoundCloud y envía el audio: .soundcloud <canción o enlace> (requiere yt-dlp)',
  category: 'download',

  async execute(sock, msg, args, { config }) {
    const jid = msg.key.remoteJid
    const prefijo = config.PREFIXES[0]
    const entrada = args.join(' ').trim()

    if (!entrada) {
      return sock.sendMessage(jid, { text: uso(prefijo, 'soundcloud', 'Monaco Bad Bunny', 'Escribe una canción o un enlace de SoundCloud.') }, { quoted: msg })
    }

    if (!(await ytDlpDisponible())) {
      return sock.sendMessage(jid, { text: '❌ Falta instalar yt-dlp en el servidor.\n\n📌 En Termux:\n`pkg install yt-dlp ffmpeg`' }, { quoted: msg })
    }

    try {
      let pista = { url: entrada }
      if (!/soundcloud\.com\//i.test(entrada)) {
        await sock.sendMessage(jid, { text: `🔎 Buscando en SoundCloud...\n\n> ${entrada}` }, { quoted: msg })
        ;[pista] = await delirius.buscarSoundCloud(entrada)
      }

      await sock.sendMessage(jid, { text: espera(`Descargando audio...\n\n🎵 ${pista.titulo || pista.url}`) }, { quoted: msg })
      const audio = await descargarLocal(pista.url, 'audio')

      const caption = caja('🟠', 'SoundCloud', [
        ['Título', String(pista.titulo || audio.titulo || 'Sin título').slice(0, 150), '🎵'],
        ['Artista', pista.artista || audio.canal, '👤'],
        ['Reproducciones', pista.plays ? pista.plays.toLocaleString('es-PE') : null, '▶️'],
        ['Tamaño', `${(audio.buffer.length / 1048576).toFixed(1)} MB`, '💾'],
      ], '🎧 Disfruta tu música')

      try {
        if (!pista.imagen) throw new Error('sin portada')
        const portada = await fetch(pista.imagen)
        if (!portada.ok) throw new Error(`HTTP ${portada.status}`)
        await sock.sendMessage(jid, { image: Buffer.from(await portada.arrayBuffer()), caption }, { quoted: msg })
      } catch {
        await sock.sendMessage(jid, { text: caption }, { quoted: msg })
      }

      const nombre = (pista.titulo || audio.titulo).replace(/[\\/:*?"<>|]/g, '_')
      await sock.sendMessage(jid, { audio: audio.buffer, mimetype: 'audio/mpeg', fileName: `${nombre}.mp3`, ptt: false }, { quoted: msg })
    } catch (error) {
      console.error('[SOUNDCLOUD]', error)
      await sock.sendMessage(jid, { text: `❌ No se pudo descargar de SoundCloud.\n\n> ${error.message || 'Error desconocido'}` }, { quoted: msg })
    }
  },
}
