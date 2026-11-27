// Código Oficial de YuiBot-MD.by AmilcarGit
// Búsqueda + descarga de música (Spotify / SoundCloud) con el mismo estilo que .yts y .play.
import { caja, mal } from '../../estilo/index.js'
import { conBotones } from '../../nucleo/botones.js'
import { motivo, soltar, tomar } from '../../nucleo/descargas.js'
import { enviarAudio } from './_enviar.js'

/**
 * @param {object} p { nombre, titulo, emoji, esEnlace, buscar, bajar, alias, ejemplo }
 */
export function crearMusica(p) {
  return {
    nombre: p.nombre,
    alias: p.alias,
    categoria: 'descargas',
    ayuda: `Busca y descarga música de ${p.titulo}: .${p.nombre} nombre de la canción · o pega un enlace`,
    async ejecutar(sock, m, ctx) {
      const consulta = ctx.args.join(' ').trim()
      if (!consulta) return ctx.responder(mal(`¿Qué canción busco en ${p.titulo}? ${ctx.prefijo}${p.nombre} ${p.ejemplo}\nO pega el enlace de la canción.`))

      // Con enlace: se descarga directo.
      if (p.esEnlace(consulta)) {
        if (!tomar(ctx.numero)) return ctx.responder(mal('Todavía estoy con tu pedido anterior, espera un poquito (>﹏<)'))
        try {
          await ctx.responder(`${p.emoji} Descargando tu canción…`)
          const c = await p.bajar(consulta)
          const nombre = [c.artista, c.titulo].filter(Boolean).join(' - ') || 'Canción'
          if (c.imagen) await ctx.enviar({ image: { url: c.imagen }, caption: caja(p.titulo, [`🎵 ${c.titulo || nombre}`, c.artista && `👤 ${c.artista}`]) }, { quoted: m }).catch(() => {})
          await enviarAudio(ctx, c.url, nombre)
        } catch (error) {
          console.error(`${p.nombre}: ${error.message}`)
          await ctx.responder(mal(`No pude bajar esa canción de ${p.titulo} (•́︵•̀)\n🔎 ${motivo(error)}${p.respaldo ? `\n💡 ${p.respaldo.replace('{p}', ctx.prefijo)}` : ''}`))
        } finally { soltar(ctx.numero) }
        return
      }

      // Con nombre: resultados para elegir.
      let lista
      try { lista = await p.buscar(consulta) } catch (error) { console.error(`${p.nombre} buscar: ${error.message}`); return ctx.responder(mal(`No pude buscar en ${p.titulo} ahora mismo (•́︵•̀)\n🔎 ${motivo(error)}`)) }
      if (!lista.length) return ctx.responder(mal(`No encontré nada en ${p.titulo} con "${consulta.slice(0, 40)}".`))
      const linea = x => [x.artista, x.duracion].filter(Boolean).join(' · ')
      if (!ctx.botonesActivos) return ctx.responder(caja(`${p.titulo}: ${consulta}`, lista.map((x, i) => `${i + 1}. ${x.titulo}\n   ${linea(x)}\n   ${ctx.prefijo}${p.nombre} ${x.url}`)))
      await conBotones(ctx, `${p.emoji} ${consulta}\n\n👇 Elige la canción`, [{
        texto: '🎧 Elegir',
        secciones: [{ titulo: p.titulo, filas: lista.map(x => ({ titulo: x.titulo, descripcion: linea(x) || p.titulo, cmd: `${p.nombre} ${x.url}` })) }]
      }], { media: lista[0].imagen, enLinea: true })
    }
  }
}
