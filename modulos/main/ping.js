//CÓDIGO ORIGINAL DE YUIBOT-MD
module.exports = {
  name: 'ping',
  aliases: [],
  description: 'Muestra la latencia real del bot',
  category: 'main',
  async execute(sock, msg) {
    const jid = msg.key.remoteJid
    const inicio = Date.now()
    const enviado = await sock.sendMessage(jid, { text: '🏓 Midiendo latencia...' })
    const latencia = Date.now() - inicio
    const calidad = latencia < 200 ? '🟢 Excelente' : latencia < 500 ? '🟡 Buena' : '🔴 Alta'
    await sock.sendMessage(jid, { text: `╭─ ✦ 📡 PING ✦\n│ ⚡ Latencia: *${latencia} ms*\n│ 📶 Calidad: *${calidad}*\n╰─ 🍃 YuiBot-MD`, edit: enviado.key })
  },
}