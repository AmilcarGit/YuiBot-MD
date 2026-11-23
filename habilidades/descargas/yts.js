// Código Oficial de YuiBot-MD.by AmilcarGit
import { buscarYoutube, motivo } from '../../nucleo/descargas.js'
import { caja, dice, mal } from '../../estilo/index.js'
import { conBotones } from '../../nucleo/botones.js'

const miniaturaDe = v => {
  const id = v.url.match(/(?:youtu\.be\/|v=)([\w-]{11})/)?.[1]
  return id ? `https://i.ytimg.com/vi/${id}/hqdefault.jpg` : null
}

export default {
  nombre: 'yts',
  alias: ['ytsearch', 'buscar'],
  categoria: 'descargas',
  ayuda: 'Busca videos en YouTube',
  async ejecutar(sock, m, ctx) {
    const consulta = ctx.args.join(' ').trim()
    if (!consulta) return ctx.responder(mal(dice('descargaUso', { uso: `${ctx.prefijo}yts nombre de la canción` })))
    let lista
    try { lista = await buscarYoutube(consulta) } catch (error) { return ctx.responder(mal(`${dice('descargaFallo')}\n\n🔎 ${motivo(error)}`)) }
    if (!lista.length) return ctx.responder(mal(dice('descargaNada')))

    // Sin botones: la lista completa en texto, con el comando para copiar.
    if (!ctx.botonesActivos) {
      return ctx.responder(caja(`YouTube: ${consulta}`, lista.map((v, i) => `${i + 1}. ${v.titulo}\n   ⏱ ${v.duracion} · ${v.canal}\n   ${ctx.prefijo}ytmp3 ${v.url}`)))
    }

    // Con botones: la imagen del primer resultado, una línea y el desplegable para elegir audio o video.
    const seccion = (titulo, emoji, cmd) => ({
      titulo,
      filas: lista.map(v => ({ titulo: v.titulo, descripcion: `${emoji} ${v.duracion} · ${v.canal}`, cmd: `${cmd} ${v.url}` }))
    })
    await conBotones(ctx, `🌸 ${consulta}\n\n👇 Elige música o video`, [{
      texto: '📥 Elegir',
      secciones: [seccion('🎵 Música (MP3)', '🎵', 'ytmp3'), seccion('🎬 Video (MP4)', '🎬', 'ytmp4')]
    }], { media: miniaturaDe(lista[0]), enLinea: true })
  }
}
