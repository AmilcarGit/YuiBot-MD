//CÓDIGO ORIGINAL DE YUIBOT-MD
function obtenerImagen(msg) {
  const mensaje = msg.message || {}
  if (mensaje.imageMessage) return mensaje.imageMessage
  const citado = mensaje.extendedTextMessage?.contextInfo?.quotedMessage
  if (citado?.imageMessage) return citado.imageMessage
  return null
}

module.exports = {
  name: 'imginfo',
  aliases: [],
  description: 'Muestra información de una imagen',
  category: 'utilidad',
  async execute(sock, msg) {
    const jid = msg.key.remoteJid
    const imagen = obtenerImagen(msg)
    if (!imagen) return sock.sendMessage(jid, { text: '❌ Envía o responde a una imagen con *imginfo*.' }, { quoted: msg })

    const tipo = imagen.mimetype || 'image/jpeg'
    const ancho = imagen.width || 'N/D'
    const alto = imagen.height || 'N/D'
    const tamaño = imagen.fileLength ? `${(Number(imagen.fileLength) / 1024).toFixed(1)} KB` : 'N/D'
    const caption = imagen.caption || 'Sin descripción'

    await sock.sendMessage(jid, { text: `╭─ ✦ 🖼️ IMGINFO ✦\n│ 📐 Dimensiones: *${ancho} × ${alto}*\n│ 📄 Formato: *${tipo}*\n│ 📦 Tamaño: *${tamaño}*\n│ 📝 Caption: *${caption}*\n╰─ 🍃 YuiBot-MD` }, { quoted: msg })
  },
}