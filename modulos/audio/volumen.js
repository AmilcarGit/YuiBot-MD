//CÓDIGO ORIGINAL DE YUIBOT-MD
const { spawn } = require('child_process')
const fs = require('fs')
const os = require('os')
const path = require('path')
const { downloadContentFromMessage } = require('@whiskeysockets/baileys')

async function descargarAudio(msg) {
  const mensaje = msg.message?.audioMessage
  if (!mensaje) return null
  const stream = await downloadContentFromMessage(mensaje, 'audio')
  const partes = []
  for await (const chunk of stream) partes.push(chunk)
  return Buffer.concat(partes)
}

function ejecutarFfmpeg(args) {
  return new Promise((resolve, reject) => {
    const proceso = spawn('ffmpeg', ['-threads', '1', ...args])
    let error = ''
    proceso.stderr.on('data', d => (error += d.toString()))
    proceso.on('close', code => code === 0 ? resolve() : reject(new Error(error)))
    proceso.on('error', reject)
  })
}

module.exports = {
  name: 'volumen',
  description: 'Sube o baja el volumen de un audio',
  category: 'audio',
  async execute(sock, msg, args) {
    const jid = msg.key.remoteJid
    const buffer = await descargarAudio(msg)
    if (!buffer) return sock.sendMessage(jid, { text: '❌ Responde a un audio. Usa, por ejemplo: /volumen 2' }, { quoted: msg })
    const nivel = Number(args[0])
    if (!Number.isFinite(nivel) || nivel <= 0 || nivel > 5) return sock.sendMessage(jid, { text: '❌ Indica un nivel entre 0.1 y 5. Ejemplo: /volumen 2' }, { quoted: msg })
    const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`
    const entrada = path.join(os.tmpdir(), `yui-vol-in-${id}.ogg`)
    const salida = path.join(os.tmpdir(), `yui-vol-out-${id}.mp3`)
    try {
      fs.writeFileSync(entrada, buffer)
      await ejecutarFfmpeg(['-y', '-i', entrada, '-filter:a', `volume=${nivel}`, '-vn', '-codec:a', 'libmp3lame', '-b:a', '192k', salida])
      await sock.sendMessage(jid, { audio: fs.readFileSync(salida), mimetype: 'audio/mpeg' }, { quoted: msg })
    } catch {
      await sock.sendMessage(jid, { text: '❌ No se pudo modificar el volumen. Verifica que FFmpeg esté disponible.' }, { quoted: msg })
    } finally {
      for (const archivo of [entrada, salida]) fs.unlink(archivo, () => {})
    }
  },
}
