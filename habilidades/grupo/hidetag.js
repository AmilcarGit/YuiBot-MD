// Código Oficial de YuiBot-MD.by AmilcarGit
import { mal } from '../../estilo/index.js'

export default {
  nombre: 'hidetag',
  alias: ['notificar', 'n'],
  categoria: 'grupo',
  soloGrupo: true,
  soloAdmin: true,
  ayuda: 'Avisa a todos sin mostrar la lista: .hidetag mensaje',
  async ejecutar(sock, m, ctx) {
    const texto = ctx.args.join(' ').trim()
    if (!texto) return ctx.responder(mal(`Escribe el mensaje: ${ctx.prefijo}hidetag hola a todos`))
    const meta = await sock.groupMetadata(ctx.jid)
    await ctx.enviar({ text: texto, mentions: meta.participants.map(p => p.id) }, { quoted: m })
  }
}
