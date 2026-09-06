//CÓDIGO ORIGINAL DE YUIBOT-MD
const { loadImage, descargarImagenMensaje, crearLienzo, dibujarCirculo } = require('../../lib/imagenes')

module.exports = {
  name: 'wanted',
  description: 'Crea un cartel estilo se busca usando un avatar',
  category: 'imagenes',

  async execute(sock, msg, args) {
    const jid = msg.key.remoteJid
    const contexto = msg.message?.extendedTextMessage?.contextInfo
    const citado = contexto?.quotedMessage
    const mencionado = contexto?.mentionedJid?.[0]
    let objetivo = mencionado || (args[0] ? `${args[0].replace(/[^0-9]/g, '')}@s.whatsapp.net` : jid)
    let buffer
    try {
      if (citado?.imageMessage) buffer = await descargarImagenMensaje(citado.imageMessage)
      else if (msg.message?.imageMessage) buffer = await descargarImagenMensaje(msg.message.imageMessage)
      else buffer = await (async () => {
        const url = await sock.profilePictureUrl(objetivo, 'image')
        const resp = await fetch(url)
        if (!resp.ok) throw new Error('avatar')
        return Buffer.from(await resp.arrayBuffer())
      })()
      const imagen = await loadImage(buffer)
      const { canvas, ctx } = crearLienzo(900, 1100, 2)
      ctx.fillStyle = '#f2df9d'
      ctx.fillRect(70, 70, 760, 960)
      ctx.fillStyle = '#6e401d'
      ctx.textAlign = 'center'
      ctx.font = 'bold 100px serif'
      ctx.fillText('WANTED', 450, 180)
      dibujarCirculo(ctx, imagen, 450, 500, 230)
      ctx.font = 'bold 46px serif'
      ctx.fillText('SE BUSCA', 450, 820)
      ctx.font = '32px serif'
      ctx.fillText(objetivo.split('@')[0], 450, 875)
      ctx.font = 'bold 30px serif'
      ctx.fillText('RECOMPENSA: 🍃', 450, 950)
      await sock.sendMessage(jid, { image: canvas.toBuffer('image/jpeg', { quality: 0.94 }), caption: '🎯 Cartel generado' }, { quoted: msg })
    } catch {
      await sock.sendMessage(jid, { text: '❌ No pude obtener una imagen para crear el cartel.' }, { quoted: msg })
    }
  },
}
