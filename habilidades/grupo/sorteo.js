// Código Oficial de YuiBot-MD.by AmilcarGit
import { caja, mal } from '../../estilo/index.js'
import { soloNumero } from '../../nucleo/utiles.js'

export default {
  nombre: 'sorteo',
  alias: ['rifa', 'elegir', 'ganador'],
  categoria: 'grupo',
  ayuda: 'Sortea entre los miembros del grupo: .sorteo (1 ganador) · .sorteo 3 premio',
  async ejecutar(sock, m, ctx) {
    if (!ctx.grupo) return ctx.responder(mal('El sorteo es solo para grupos.'))
    if (!ctx.esAdmin && !ctx.esDueno) return ctx.responder(mal('Solo los admins pueden hacer sorteos.'))
    const args = [...ctx.args]
    const cuantos = /^\d{1,2}$/.test(args[0] || '') ? Math.min(10, Math.max(1, Number(args.shift()))) : 1
    const premio = args.join(' ').trim().slice(0, 60)
    try {
      const meta = await sock.groupMetadata(ctx.jid)
      const yo = new Set([sock.user?.id, sock.user?.lid].filter(Boolean).map(soloNumero))
      const lista = meta.participants.filter(p => ![p.id, p.lid, p.phoneNumber].some(x => x && yo.has(soloNumero(x))))
      if (lista.length < cuantos) return ctx.responder(mal('No hay suficientes miembros para ese sorteo.'))
      const ganadores = lista.sort(() => Math.random() - 0.5).slice(0, cuantos).map(p => p.phoneNumber || p.id)
      await ctx.enviar({ text: caja('Sorteo', [premio && `🎁 ${premio}`, `🏆 ${cuantos > 1 ? 'Ganadores' : 'Ganador'}:`, ...ganadores.map((j, i) => `${i + 1}. @${soloNumero(j)}`)]), mentions: ganadores }, { quoted: m })
    } catch (error) { console.error(`sorteo: ${error.message}`); await ctx.responder(mal('No pude leer los miembros del grupo (•́︵•̀)')) }
  }
}
