// Código Oficial de YuiBot-MD.by AmilcarGit
import { mal } from '../../estilo/index.js'

const mencion = async (sock, ctx, conLista) => {
  const meta = await sock.groupMetadata(ctx.jid)
  const ids = meta.participants.map(p => p.id)
  const mensaje = ctx.args.join(' ').trim() || 'Atención, ¡todos!'
  const texto = conLista ? `📣 ${mensaje}\n\n${ids.map(id => `✿ @${id.split('@')[0]}`).join('\n')}` : mensaje
  await ctx.enviar({ text: texto, mentions: ids }, { quoted: ctx.m })
}

export default {
  nombre: 'todos',
  alias: ['tagall', 'invocar'],
  categoria: 'grupo',
  soloGrupo: true,
  soloAdmin: true,
  ayuda: 'Menciona a todos con un mensaje: .todos reunión a las 8',
  async ejecutar(sock, m, ctx) {
    try { await mencion(sock, ctx, true) } catch { await ctx.responder(mal('No pude mencionar al grupo.')) }
  }
}
