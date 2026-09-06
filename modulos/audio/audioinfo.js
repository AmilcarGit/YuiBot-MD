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

function probe(archivo) {
  return new Promise((resolve, reject) => {
    const proceso = spawn('ffprobe', ['-v', 'error', '-show_entries', 'format=duration,size,format_name,bit_rate', '-show_entries', 'stream=codec_name,sample_rate,channels', '-of', 'json', archivo])
    let salida = ''
    let error = ''
    proceso.stdout.on('data', d => (salida += d.toString()))
    proceso.stderr.on('data', d => (error += d.toString()))
    proceso.on('close', code => code === 0 ? resolve(JSON.parse(salida)) : reject(new Error(error)))
    proceso.on('error', reject)
  })
}

module.exports = {
  name: 'audioinfo',
  description: 'Muestra información técnica del audio citado',
  category: 'audio',
  async execute(sock, msg) {
    const buffer = await descargarAudio(msg)
    if (!buffer) return sock.sendMessage(msg.key.remoteJid, { text: '❌ Responde a un audio para usar este comando.' }, { quoted: msg })
    const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`
    const archivo = path.join(os.tmpdir(), `yui-audio-${id}.ogg`)
    try {
      fs.writeFileSync(archivo, buffer)
      const data = await probe(archivo)
      const formato = data.format || {}
      const stream = data.streams?.[0] || {}
      const duracion = Number(formato.duration || 0)
      const minutos = Math.floor(duracion / 60)
      const segundos = Math.floor(duracion % 60).toString().padStart(2, '0')
      const tamano = Number(formato.size || buffer.length)
      const texto = `╭─ 🎵 AUDIOINFO
│ ⏱️ Duración: ${minutos}:${segundos}
│ 💾 Tamaño: ${(tamano / 1024 / 1024).toFixed(2)} MB
│ 🎼 Formato: ${formato.format_name || 'desconocido'}
│ 🔊 Códec: ${stream.codec_name || 'desconocido'}
│ 📡 Bitrate: ${formato.bit_rate ? `${Math.round(Number(formato.bit_rate) / 1000)} kbps` : 'desconocido'}
│ 🎚️ Canales: ${stream.channels || 'desconocido'}
│ ⚙️ Sample rate: ${stream.sample_rate ? `${stream.sample_rate} Hz` : 'desconocido'}
╰─ 🍃 YuiBot-MD`
      await sock.sendMessage(msg.key.remoteJid, { text: texto }, { quoted: msg })
    } catch {
      await sock.sendMessage(msg.key.remoteJid, { text: '❌ No se pudo analizar el audio. Verifica que FFmpeg esté disponible.' }, { quoted: msg })
    } finally {
      fs.unlink(archivo, () => {})
    }
  },
}
