//CÓDIGO ORIGINAL DE YUIBOT-MD
const { crearLienzo, textoAjustado } = require('../../lib/imagenes')

module.exports = {
  name: 'quote',
  description: 'Crea una imagen con una frase',
  category: 'imagenes',

  async execute(sock, msg, args) {
    const jid = msg.key.remoteJid
    const frase = args.join(' ').trim()
    if (!frase) return sock.sendMessage(jid, { text: '❌ Escribe una frase.\nEjemplo: /quote Nunca te rindas' }, { quoted: msg })
    const { canvas, ctx } = crearLienzo(1200, 800, Math.floor(Math.random() * 4))
    ctx.fillStyle = '#ffffff'
    ctx.textAlign = 'center'
    ctx.font = 'bold 62px sans-serif'
    textoAjustado(ctx, `“${frase}”`, 600, 350, 950, 80)
    ctx.font = '30px sans-serif'
    ctx.fillStyle = '#d9e8ff'
    ctx.fillText('🍃 YuiBot-MD', 600, 680)
    await sock.sendMessage(jid, { image: canvas.toBuffer('image/jpeg', { quality: 0.95 }), caption: '💬 Frase generada' }, { quoted: msg })
  },
}
