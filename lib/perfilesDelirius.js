const fetch = require('./http').fetchSeguro
const delirius = require('./delirius')
const { caja, uso, recortar } = require('./estilo')

const num = (n) => (n === undefined || n === null || n === '' ? '—' : Number(String(n).replace(/[^\d.-]/g, '')).toLocaleString('es'))
const si = (v) => (v ? 'Sí ✅' : 'No')

async function enviar(sock, msg, imagen, caption) {
  const jid = msg.key.remoteJid
  if (imagen) {
    try {
      const r = await fetch(imagen)
      if (r.ok) return await sock.sendMessage(jid, { image: Buffer.from(await r.arrayBuffer()), caption }, { quoted: msg })
    } catch { /* sin foto: se envía solo el texto */ }
  }
  return sock.sendMessage(jid, { text: caption }, { quoted: msg })
}

module.exports = { num, si, enviar, delirius, caja, uso, recortar }
