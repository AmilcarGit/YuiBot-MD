// Código Oficial de YuiBot-MD.by AmilcarGit
import { caja, mal } from '../../estilo/index.js'
import { REACCIONES, bajar, nombresReaccion, reaccionDe, reaccionGif } from '../../nucleo/delirius.js'
import { conBotones } from '../../nucleo/botones.js'
import { soloNumero } from '../../nucleo/utiles.js'
import { objetivos } from '../grupo/_comun.js'

const seccion = (titulo, claves) => ({ titulo, filas: claves.map(k => ({ titulo: `${REACCIONES[k].emoji} ${REACCIONES[k].es[0]}`, descripcion: REACCIONES[k].frase.replace('{t}', 'alguien'), cmd: `reaccion ${k}` })) })
const conOtro = Object.keys(REACCIONES).filter(k => !REACCIONES[k].solo)
const solas = Object.keys(REACCIONES).filter(k => REACCIONES[k].solo)

export default {
  nombre: 'reaccion',
  alias: ['reacciones', 'gif', ...nombresReaccion()],
  categoria: 'herramientas',
  ayuda: 'GIFs de anime para reaccionar: .abrazo @alguien · .beso · .caricia · .bailar · .llorar · .reaccion (menú)',
  async ejecutar(sock, m, ctx) {
    // ctx.comando es el nombre de la habilidad; la palabra que se escribió está en el texto.
    const usada = String(ctx.texto || '').trim().slice(ctx.prefijo.length).split(/\s+/)[0].toLowerCase()
    const clave = reaccionDe(usada) || reaccionDe(ctx.args[0])
    if (!clave) {
      return conBotones(ctx, caja('Reacciones', ['🎞️ GIFs de anime para responder a alguien', '', `✍️ ${ctx.prefijo}abrazo @amigo`, `💞 ${ctx.prefijo}beso (o responde a su mensaje)`, '', '👇 Elige una reacción']),
        [{ texto: '🎞️ Reacciones', secciones: [seccion('Con alguien', conOtro.slice(0, 10)), seccion('Más con alguien', conOtro.slice(10)), seccion('Solo tú', solas)] }])
    }
    const r = REACCIONES[clave]
    const yo = m?.key?.participant || m?.key?.remoteJid
    const otros = ctx.web ? [] : objetivos(m).filter(j => soloNumero(j) !== soloNumero(yo))
    const quien = ctx.web ? (ctx.usuario?.nombre || 'Alguien') : `@${soloNumero(yo)}`
    const aQuien = otros.length ? otros.slice(0, 3).map(j => `@${soloNumero(j)}`).join(', ') : 'todos'
    const pie = `${r.emoji} ${quien} ${r.frase.replace('{t}', aQuien)}`
    try {
      let url = await reaccionGif(clave)
      // La web (https) no puede mostrar un video http: se incrusta en la respuesta.
      let video = { url }
      if (ctx.web) video = await bajar(url, 3 * 1024 * 1024).catch(() => ({ url: url.replace(/^http:/, 'https:') }))
      await ctx.enviar({ video, mimetype: 'video/mp4', gifPlayback: true, caption: pie, mentions: ctx.web ? undefined : [yo, ...otros].filter(Boolean) }, { quoted: m })
    } catch (error) {
      console.error(`reaccion ${clave}: ${error.message}`)
      await ctx.responder(mal('No encontré ese GIF ahora mismo (•́︵•̀) Prueba otra vez.'))
    }
  }
}
