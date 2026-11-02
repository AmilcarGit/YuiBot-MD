const { enviar, delirius, caja, recortar } = require('../../lib/perfilesDelirius')

module.exports = {
  name: 'minecraftnews',
  aliases: ['mcnews', 'mcnoticias', 'noticiasminecraft'],
  description: 'Últimas noticias oficiales de Minecraft: .minecraftnews [página]',
  category: 'utilidad',

  async execute(sock, msg, args) {
    const jid = msg.key.remoteJid
    const pagina = Math.max(1, Math.min(50, parseInt(args[0], 10) || 1))

    try {
      const { noticias, total, pagina: pag } = await delirius.minecraftNoticias(pagina)
      const items = noticias.slice(0, 6)
      const texto = caja('⛏️', 'Minecraft', items.map((n, i) => `${i + 1}. *${recortar(n.titulo, 70)}*\n📅 ${n.fecha}${n.autor ? ` · ✍️ ${n.autor}` : ''}\n🔗 ${n.url}`),
        `Página ${pag}${total ? ` · ${Number(total).toLocaleString('es')} noticias` : ''} · usa .minecraftnews ${pag + 1} para más`)
      await enviar(sock, msg, items[0]?.imagen, texto)
    } catch (error) {
      console.error('[MINECRAFTNEWS]', error)
      await sock.sendMessage(jid, { text: `❌ No pude traer las noticias de Minecraft.\n\n> ${error.message}` }, { quoted: msg })
    }
  },
}
