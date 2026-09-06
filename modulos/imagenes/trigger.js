//CÓDIGO ORIGINAL DE YUIBOT-MD
const { loadImage, descargarImagenMensaje, crearLienzo, dibujarCirculo } = require('../../lib/imagenes')

module.exports = {
  name: 'trigger',
  description: 'Crea un efecto visual de disparo usando un avatar',
  category: 'imagenes',

  async execute(sock, msg) {
    const jid = msg.key.remoteJid
    const contexto = msg.message?.extendedTextMessage?.contextInfo
    const citado = contexto?.quotedMessage
    const mencionado = contexto?.mentionedJid?.[0]
    let buffer
    try {
      if (citado?.imageMessage) buffer = await descargarImagenMensaje(citado.imageMessage)
      else if (msg.message?.imageMessage) buffer = await descargarImagenMensaje(msg.message.imageMessage)
      else {
        const objetivo = mencionado || jid
        const url = await sock.profilePictureUrl(objetivo, 'image')
        const resp = await fetch(url)
        if (!resp.ok) throw new Error('avatar')
        buffer = Buffer.from(await resp.arrayBuffer())
      }
      const imagen = await loadImage(buffer)
      const { canvas, ctx } = crearLienzo(1000, 1000, 0)
      dibujarCirculo(ctx, imagen, 500, 470, 280)
      ctx.save()
      ctx.strokeStyle = '#ff3b3b'
      ctx.lineWidth = 24
      ctx.beginPath()
      ctx.moveTo(650, 690)
      ctx.lineTo(850, 880)
      ctx.stroke()
      ctx.fillStyle = '#ffcc66'
      ctx.beginPath()
      ctx.moveTo(810, 840)
      ctx.lineTo(940, 960)
      ctx.lineTo(860, 930)
      ctx.closePath()
      ctx.fill()
      ctx.restore()
      ctx.textAlign = 'center'
      ctx.fillStyle = '#ffffff'
      ctx.font = 'bold 58px sans-serif'
      ctx.fillText('TRIGGER', 500, 145)
      ctx.font = '26px sans-serif'
      ctx.fillStyle = '#ffd7d7'
      ctx.fillText('⚡ Efecto generado por YuiBot-MD', 500, 900)
      await sock.sendMessage(jid, { image: canvas.toBuffer('image/jpeg', { quality: 0.94 }), caption: '⚡ Trigger generado' }, { quoted: msg })
    } catch {
      await sock.sendMessage(jid, { text: '❌ Envía o cita una imagen, o menciona a un usuario.' }, { quoted: msg })
    }
  },
}
