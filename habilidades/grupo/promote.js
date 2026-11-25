// Código Oficial de YuiBot-MD.by AmilcarGit
import ajustes from '../../ajustes.js'
import { mal, ok } from '../../estilo/index.js'
import { soloNumero } from '../../nucleo/utiles.js'
import { botEsAdmin, objetivos, participanteDe } from './_comun.js'

export default {
  nombre: 'promote',
  alias: ['daradmin', 'admin'],
  categoria: 'grupo',
  soloGrupo: true,
  soloAdmin: true,
  ayuda: 'Hace admin a alguien: .promote @persona',
  async ejecutar(sock, m, ctx) {
    const metas = objetivos(m)
    if (!metas.length) return ctx.responder(mal(`Menciona con @ o responde al mensaje de la persona: ${ctx.prefijo}promote @persona`))
    const grupo = await sock.groupMetadata(ctx.jid)
    if (!botEsAdmin(sock, grupo)) return ctx.responder(mal('Necesito ser admin del grupo para hacer eso.'))
    const validos = []
    for (const jid of metas) {
      const p = participanteDe(grupo, jid)
      if (!p) continue
      const propio = [p.id, p.lid, p.phoneNumber].some(x => x && ajustes.dueno.includes(soloNumero(x)))
      if (p.admin) continue
      validos.push(p.id)
    }
    if (!validos.length) return ctx.responder(mal('Esa persona ya es admin o no está en el grupo.'))
    await sock.groupParticipantsUpdate(ctx.jid, validos, 'promote')
    await ctx.enviar({ text: ok(`👑 Ahora es admin: ${validos.map(id => '@' + id.split('@')[0]).join(', ')}`), mentions: validos }, { quoted: m })
  }
}
