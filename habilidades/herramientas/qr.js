// Código Oficial de YuiBot-MD.by AmilcarGit
import { mal } from '../../estilo/index.js'
import { urlQr } from '../../nucleo/herramientas.js'

export default {
  nombre: 'qr',
  alias: ['codigoqr', 'crearqr'],
  categoria: 'herramientas',
  ayuda: 'Crea un código QR: .qr https://tuenlace.com (o cualquier texto)',
  async ejecutar(sock, m, ctx) {
    const texto = ctx.args.join(' ').trim()
    if (!texto) return ctx.responder(mal(`¿Qué pongo en el QR? ${ctx.prefijo}qr https://tuenlace.com`))
    if (texto.length > 800) return ctx.responder(mal('Ese texto es muy largo para un QR (máximo 800 letras).'))
    try { await ctx.enviar({ image: { url: urlQr(texto) }, caption: '📱 Tu código QR está listo' }, { quoted: m }) }
    catch (error) { console.error(`qr: ${error.message}`); await ctx.responder(mal('No pude crear el QR ahora mismo (•́︵•̀)')) }
  }
}
