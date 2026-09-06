//CÓDIGO ORIGINAL DE YUIBOT-MD
const { crearLienzo, textoAjustado } = require('../../lib/imagenes')

module.exports = {
  name: 'logo',
  description: 'Crea un logo personalizado con texto',
  category: 'imagenes',

  async execute(sock, msg, args) {
    const jid = msg.key.remoteJid
    const texto = args.join(' ').trim()
    if (!texto) return sock.sendMessage(jid, { text: '❌ Escribe el texto del logo.\nEjemplo: /logo YuiBot' }, { quoted: msg })
    const { canvas, ctx } = crearLienzo(1200, 700, Math.floor(Math.random() * 4))
    ctx.textAlign = 'center'
    ctx.fillStyle = '#ffffff'
    ctx.font = 'bold 92px sans-serif'
    const lineas = textoAjustado(ctx, texto.toUpperCase(), 600, 335, 980, 110)
    ctx.font = '28px sans-serif'
    ctx.fillStyle = '#d9e8ff'
    ctx.fillText('YuiBot-MD', 600, 535 + Math.max(0, lineas - 1) * 20)
    await sock.sendMessage(jid, { image: canvas.toBuffer('image/png'), caption: `🎨 Logo: ${texto}` }, { quoted: msg })
  },
}
