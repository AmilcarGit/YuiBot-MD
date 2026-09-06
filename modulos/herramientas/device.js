//CÓDIGO ORIGINAL DE YUIBOT-MD
function tipoMensaje(message) {
  if (!message) return 'desconocido'
  const claves = Object.keys(message)
  return claves.find(k => !['messageContextInfo', 'senderKeyDistributionMessage'].includes(k)) || 'desconocido'
}

module.exports = {
  name: 'device',
  description: 'Muestra información del dispositivo y del mensaje',
  category: 'herramientas',
  async execute(sock, msg) {
    const jid = msg.key.remoteJid || 'desconocido'
    const participante = msg.key.participant || msg.key.participantAlt || jid
    const numero = participante.split('@')[0].split(':')[0]
    const plataforma = msg.key.fromMe ? 'Bot' : (msg.pushName ? 'Usuario' : 'Desconocida')
    const mensaje = tipoMensaje(msg.message)
    const grupo = jid.endsWith('@g.us') ? 'Sí' : 'No'
    await sock.sendMessage(jid, { text: `╭─ ✦ 📱 DEVICE ✦
│ 👤 Usuario: *${numero}*
│ 💬 Chat: *${grupo === 'Sí' ? 'Grupo' : 'Privado'}*
│ 📦 Mensaje: *${mensaje}*
│ 🤖 Emisor: *${plataforma}*
│ 🆔 JID: *${jid}*
│ 🔑 ID: *${msg.key.id || 'N/A'}*
╰─ 🍃 YuiBot-MD` }, { quoted: msg })
  },
}
