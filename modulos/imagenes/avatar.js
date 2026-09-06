//CÓDIGO ORIGINAL DE YUIBOT-MD
const { cargarAvatar, loadImage, crearLienzo, dibujarCirculo } = require('../../lib/imagenes')

module.exports = {
  name: 'avatar',
  description: 'Obtiene el avatar del usuario mencionado, indicado por número o del chat actual',
  category: 'imagenes',

  async execute(sock, msg, args) {
    const jid = msg.key.remoteJid
    const citado = msg.message?.extendedTextMessage?.contextInfo
    const mencionado = citado?.mentionedJid?.[0]
    const numero = args.join('').replace(/[^0-9]/g, '')
    const objetivo = mencionado || (numero ? `${numero}@s.whatsapp.net` : jid)

    try {
      const buffer = await cargarAvatar(sock, objetivo)
      const imagen = await loadImage(buffer)
      const { canvas, ctx } = crearLienzo(900, 900, 1)
      dibujarCirculo(ctx, imagen, 450, 365, 245)
      ctx.textAlign = 'center'
      ctx.fillStyle = '#ffffff'
      ctx.font = 'bold 54px sans-serif'
      ctx.fillText('AVATAR', 450, 705)
      ctx.font = '28px sans-serif'
      ctx.fillStyle = '#d9e8ff'
      ctx.fillText(objetivo.split('@')[0], 450, 755)
      await sock.sendMessage(jid, { image: canvas.toBuffer('image/jpeg', { quality: 0.94 }), caption: '🖼️ Avatar generado' }, { quoted: msg })
    } catch {
      await sock.sendMessage(jid, { text: '❌ No se pudo obtener el avatar de ese usuario.' }, { quoted: msg })
    }
  },
}
