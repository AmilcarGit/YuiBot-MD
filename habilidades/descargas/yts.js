// Código Oficial de YuiBot-MD.by AmilcarGit
import { buscarYoutube } from '../../nucleo/descargas.js'
import { motivo } from '../../nucleo/descargas.js'
import { caja, dice, mal } from '../../estilo/index.js'
import { conBotones } from '../../nucleo/botones.js'

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

    const filas = lista.map((v, i) => `${i + 1}. ${v.titulo}\n   ⏱ ${v.duracion} · ${v.canal}`)
    const texto = caja(`YouTube: ${consulta}`, filas)
    const seccion = (titulo, cmd) => ({ titulo, filas: lista.map((v, i) => ({ titulo: `${i + 1}. ${v.titulo}`, descripcion: `${v.duracion} · ${v.canal}`, cmd: `${cmd} ${v.url}` })) })
    await conBotones(ctx, texto, [{ texto: '📥 Descargar', secciones: [seccion('🎵 Audio MP3', 'ytmp3'), seccion('🎬 Video MP4', 'ytmp4')] }])
  }
}
