//CÓDIGO ORIGINAL DE YUIBOT-MD
const { crearLienzo, textoAjustado } = require('../../lib/imagenes')

module.exports = {
  name: 'wallpaper',
  description: 'Genera un fondo aleatorio en alta resolución',
  category: 'imagenes',

  async execute(sock, msg) {
    const jid = msg.key.remoteJid
    const variante = Math.floor(Math.random() * 4)
    const { canvas, ctx } = crearLienzo(1440, 900, variante)
    for (let i = 0; i < 18; i++) {
      ctx.beginPath()
      ctx.arc(Math.random() * 1440, Math.random() * 900, 15 + Math.random() * 120, 0, Math.PI * 2)
      ctx.fillStyle = `rgba(255,255,255,${0.025 + Math.random() * 0.08})`
      ctx.fill()
    }
    ctx.fillStyle = '#ffffff'
    ctx.font = 'bold 76px sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText('YuiBot-MD', 720, 430)
    ctx.font = '32px sans-serif'
    ctx.fillStyle = '#d9e8ff'
    textoAjustado(ctx, 'Wallpaper aleatorio • generado localmente', 720, 490, 900, 42)
    await sock.sendMessage(jid, { image: canvas.toBuffer('image/jpeg', { quality: 0.95 }), caption: '🖼️ Wallpaper generado' }, { quoted: msg })
  },
}
