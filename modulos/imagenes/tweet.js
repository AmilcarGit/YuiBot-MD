//CÓDIGO ORIGINAL DE YUIBOT-MD
const { crearLienzo, textoAjustado } = require('../../lib/imagenes')

module.exports = {
  name: 'tweet',
  description: 'Genera una imagen estilo publicación de X con texto',
  category: 'imagenes',

  async execute(sock, msg, args) {
    const jid = msg.key.remoteJid
    const texto = args.join(' ').trim()
    if (!texto) return sock.sendMessage(jid, { text: '❌ Escribe el texto de la publicación.\nEjemplo: /tweet Hola mundo' }, { quoted: msg })
    const { canvas, ctx } = crearLienzo(1200, 800, 1)
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(90, 80, 1020, 640)
    ctx.fillStyle = '#111111'
    ctx.textAlign = 'left'
    ctx.font = 'bold 34px sans-serif'
    ctx.fillText('YuiBot', 205, 155)
    ctx.font = '24px sans-serif'
    ctx.fillStyle = '#667085'
    ctx.fillText('@yuibot_md · ahora', 205, 195)
    ctx.fillStyle = '#111111'
    ctx.font = '34px sans-serif'
    textoAjustado(ctx, texto, 150, 285, 900, 55)
    ctx.fillStyle = '#667085'
    ctx.font = '24px sans-serif'
    ctx.fillText('♡   0 respuestas     ↻   0 reposts     ♡   0 Me gusta', 150, 650)
    await sock.sendMessage(jid, { image: canvas.toBuffer('image/jpeg', { quality: 0.95 }), caption: '🐦 Publicación generada' }, { quoted: msg })
  },
}
