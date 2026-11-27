// Código Oficial de YuiBot-MD.by AmilcarGit
// Una sola lógica para TikTok, Instagram, X y Threads (API de Delirius).
import { mal } from '../../estilo/index.js'
import { REDES, descargarRed } from '../../nucleo/delirius.js'
import { enviarImagenes } from '../../nucleo/album.js'
import { motivo, soltar, tomar } from '../../nucleo/descargas.js'

export function crearRed(red, { alias, ejemplo }) {
  const cfg = REDES[red]
  return {
    nombre: red,
    alias,
    categoria: 'descargas',
    ayuda: `Descarga de ${cfg.nombre}: .${red} ${ejemplo}`,
    async ejecutar(sock, m, ctx) {
      const enlace = String(ctx.args[0] || '').trim()
      if (!cfg.esEnlace(enlace)) return ctx.responder(mal(`Pega el enlace de una publicación de ${cfg.nombre}: ${ctx.prefijo}${red} ${ejemplo}`))
      if (!tomar(ctx.numero)) return ctx.responder(mal('Todavía estoy con tu pedido anterior, espera un poquito (>﹏<)'))
      try {
        await ctx.responder(`${cfg.emoji} Buscando tu descarga de ${cfg.nombre}…`)
        const r = await descargarRed(red, enlace)
        const pie = [`${cfg.emoji} ${cfg.nombre}`, r.autor && `👤 ${r.autor}`, r.titulo].filter(Boolean).join('\n')
        const fotos = r.medios.filter(x => x.tipo === 'image').slice(0, 10)
        const otros = r.medios.filter(x => x.tipo !== 'image').slice(0, 4)
        let primero = true
        for (const v of otros) {
          const caption = primero ? pie : undefined; primero = false
          if (v.tipo === 'audio') await ctx.enviar({ audio: { url: v.url }, mimetype: 'audio/mpeg' }, { quoted: m })
          else await ctx.enviar({ video: { url: v.url }, mimetype: 'video/mp4', caption }, { quoted: m })
        }
        if (fotos.length === 1) await ctx.enviar({ image: { url: fotos[0].url }, caption: primero ? pie : undefined }, { quoted: m })
        else if (fotos.length) await enviarImagenes(ctx, m, fotos.map((f, i) => ({ url: f.url, caption: i === 0 && primero ? pie : undefined })))
      } catch (error) {
        console.error(`${red}: ${error.message}`)
        await ctx.responder(mal(`No pude bajar esa publicación de ${cfg.nombre} (•́︵•̀)\n🔎 ${motivo(error)}\nSolo funcionan las públicas.`))
      } finally { soltar(ctx.numero) }
    }
  }
}
