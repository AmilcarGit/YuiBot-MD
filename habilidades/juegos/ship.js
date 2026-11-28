// Código Oficial de YuiBot-MD.by AmilcarGit
import { createHash } from 'node:crypto'
import { caja, mal } from '../../estilo/index.js'
import { soloNumero } from '../../nucleo/utiles.js'
import { objetivos } from '../grupo/_comun.js'

export const compatibilidad = (a, b) => createHash('sha256').update([a, b].map(x => String(x).toLowerCase().trim()).sort().join('|')).digest().readUInt16BE(0) % 101
const frase = p => (p >= 90 ? '💞 ¡Almas gemelas! Esto es destino.' : p >= 70 ? '💖 Hay mucha química, ¡atrévanse!' : p >= 50 ? '💕 Tienen futuro si le ponen ganas.' : p >= 30 ? '🙂 Mejor como amigos… por ahora.' : '💔 Uf… los astros no ayudan.')

export default {
  nombre: 'ship',
  alias: ['pareja', 'compatibilidad', 'amor'],
  categoria: 'juegos',
  ayuda: 'Compatibilidad entre dos personas: .ship @ana @luis (o .ship ana luis)',
  async ejecutar(sock, m, ctx) {
    const menciones = ctx.web ? [] : objetivos(m)
    let a; let b; let ids
    if (menciones.length >= 2) { [a, b] = menciones.slice(0, 2).map(j => `@${soloNumero(j)}`); ids = menciones.slice(0, 2) }
    else if (menciones.length === 1) { a = `@${soloNumero(m?.key?.participant || m?.key?.remoteJid)}`; b = `@${soloNumero(menciones[0])}`; ids = [m?.key?.participant || m?.key?.remoteJid, menciones[0]] }
    else {
      const t = ctx.args.join(' ').split(/\s+(?:y|con|\+|x)\s+|\s+/).filter(Boolean)
      if (t.length < 2) return ctx.responder(mal(`Dime dos nombres: ${ctx.prefijo}ship ana luis\nO menciona a dos personas.`))
      a = t[0]; b = t[1]
    }
    const p = compatibilidad(a, b)
    const llenos = Math.round(p / 10)
    const texto = caja('Ship', [`${a} 💘 ${b}`, '', `${'💗'.repeat(llenos)}${'🤍'.repeat(10 - llenos)} *${p}%*`, '', frase(p)])
    if (ids) await ctx.enviar({ text: texto, mentions: ids }, { quoted: m })
    else await ctx.responder(texto)
  }
}
