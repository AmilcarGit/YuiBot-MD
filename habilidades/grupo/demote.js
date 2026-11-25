// Código Oficial de YuiBot-MD.by AmilcarGit
import ajustes from '../../ajustes.js'
import { mal, ok } from '../../estilo/index.js'
import { soloNumero } from '../../nucleo/utiles.js'
import { botEsAdmin, objetivos, participanteDe } from './_comun.js'

export default {
  nombre: 'demote',
  alias: ['quitaradmin'],
  categoria: 'grupo',
  soloGrupo: true,
  soloAdmin: true,
  ayuda: 'Quita el admin a alguien: .demote @persona',
  async ejecutar(sock, m, ctx) {
    const metas = objetivos(m)
    if (!metas.length) return ctx.responder(mal(`Menciona con @ o responde al mensaje de la persona: ${ctx.prefijo}demote @persona`))
    const grupo = await sock.groupMetadata(ctx.jid)
    if (!botEsAdmin(sock, grupo)) return ctx.responder(mal('Necesito ser admin del grupo para hacer eso.'))
    const validos = []
    for (const jid of metas) {
      const p = participanteDe(grupo, jid)
      if (!p) continue
      const propio = [p.id, p.lid, p.phoneNumber].some(x => x && ajustes.dueno.includes(soloNumero(x)))
      if (propio || !p.admin) continue
      validos.push(p.id)
    }
    if (!validos.length) return ctx.responder(mal('Esa persona no es admin, es el dueño del bot o no está en el grupo.'))
    await sock.groupParticipantsUpdate(ctx.jid, validos, 'demote')
    await ctx.enviar({ text: ok(`🌙 Ya no es admin: ${validos.map(id => '@' + id.split('@')[0]).join(', ')}`), mentions: validos }, { quoted: m })
  }
}
