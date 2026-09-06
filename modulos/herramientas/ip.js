//CÓDIGO ORIGINAL DE YUIBOT-MD
module.exports = {
  name: 'ip',
  description: 'Muestra información básica de una dirección IP',
  category: 'herramientas',
  async execute(sock, msg, args) {
    const jid = msg.key.remoteJid
    const ip = args[0]
    if (ip && !/^(?:\d{1,3}\.){3}\d{1,3}$/.test(ip) && !/^[0-9a-f:]+$/i.test(ip)) return sock.sendMessage(jid, { text: '❌ Escribe una IP válida.\nEjemplo: *ip 8.8.8.8*' }, { quoted: msg })
    try {
      const endpoint = ip ? `https://ipwho.is/${encodeURIComponent(ip)}` : 'https://ipwho.is/'
      const respuesta = await fetch(endpoint)
      if (!respuesta.ok) throw new Error(`HTTP ${respuesta.status}`)
      const data = await respuesta.json()
      if (data.success === false) throw new Error(data.message || 'IP no válida')
      await sock.sendMessage(jid, { text: `╭─ ✦ 📡 IP ✦
│ 🌐 IP: *${data.ip || ip || 'N/A'}*
│ 🌎 País: *${data.country || 'N/A'}*
│ 🏙️ Ciudad: *${data.city || 'N/A'}*
│ 🏢 ISP: *${data.connection?.isp || 'N/A'}*
│ 🛰️ ASN: *${data.connection?.asn || 'N/A'}*
│ 📍 Coordenadas: *${data.latitude ?? 'N/A'}, ${data.longitude ?? 'N/A'}*
╰─ 🍃 YuiBot-MD` }, { quoted: msg })
    } catch (error) {
      await sock.sendMessage(jid, { text: `❌ No se pudo consultar la IP: ${error.message}` }, { quoted: msg })
    }
  },
}
