//CÓDIGO ORIGINAL DE YUIBOT-MD
module.exports = {
  name: 'urlinfo',
  description: 'Analiza una URL y muestra sus datos básicos',
  category: 'herramientas',
  async execute(sock, msg, args) {
    const jid = msg.key.remoteJid
    const entrada = args[0]
    if (!entrada) return sock.sendMessage(jid, { text: '❌ Usa: *urlinfo https://ejemplo.com*' }, { quoted: msg })
    let url
    try { url = new URL(entrada) } catch { return sock.sendMessage(jid, { text: '❌ La URL no es válida.' }, { quoted: msg }) }
    if (!['http:', 'https:'].includes(url.protocol)) return sock.sendMessage(jid, { text: '❌ Solo se permiten URLs HTTP o HTTPS.' }, { quoted: msg })
    try {
      const respuesta = await fetch(url, { method: 'HEAD', redirect: 'follow', signal: AbortSignal.timeout(10000) })
      const contenido = respuesta.headers.get('content-type') || 'N/A'
      const longitud = respuesta.headers.get('content-length') || 'N/A'
      await sock.sendMessage(jid, { text: `╭─ ✦ 🔗 URLINFO ✦
│ 🌐 Host: *${url.hostname}*
│ 🔐 Protocolo: *${url.protocol.replace(':', '').toUpperCase()}*
│ 🚪 Puerto: *${url.port || 'predeterminado'}*
│ 📂 Ruta: *${url.pathname || '/'}*
│ ↪️ Estado: *${respuesta.status} ${respuesta.statusText}*
│ 📦 Tipo: *${contenido}*
│ 📏 Tamaño: *${longitud} bytes*
│ 🔄 URL final: *${respuesta.url}*
╰─ 🍃 YuiBot-MD` }, { quoted: msg })
    } catch (error) {
      await sock.sendMessage(jid, { text: `❌ No se pudo analizar la URL: ${error.message}` }, { quoted: msg })
    }
  },
}
