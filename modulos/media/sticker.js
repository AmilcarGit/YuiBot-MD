//CÓDIGO ORIGINAL DE YUIBOT-MD
const { downloadContentFromMessage } = require('@whiskeysockets/baileys')
const { spawn } = require('child_process')
const fs = require('fs')
const os = require('os')
const path = require('path')
const webpmux = require('node-webpmux')

function ejecutarFfmpeg(args) {
  return new Promise((resolve, reject) => {
    const proceso = spawn('ffmpeg', args)
    let stderr = ''
    proceso.stderr.on('data', (d) => (stderr += d.toString()))
    proceso.on('close', (code) => {
      if (code === 0) resolve()
      else reject(new Error(`ffmpeg salió con código ${code}: ${stderr.slice(-300)}`))
    })
    proceso.on('error', reject)
  })
}

async function descargarMedia(mensaje, tipo) {
  const stream = await downloadContentFromMessage(mensaje, tipo)
  let buffer = Buffer.from([])
  for await (const chunk of stream) {
    buffer = Buffer.concat([buffer, chunk])
  }
  return buffer
}

module.exports = {
  name: 'sticker',
  aliases: ['s', 'stiker'],
  description: 'Convierte una imagen o video citado en sticker',
  category: 'media',

  async execute(sock, msg, args, { config }) {
    const jid = msg.key.remoteJid
    const citado = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage

    let mediaMsg = null
    let tipo = null

    if (citado?.imageMessage) {
      mediaMsg = citado.imageMessage
      tipo = 'image'
    } else if (citado?.videoMessage) {
      mediaMsg = citado.videoMessage
      tipo = 'video'
    } else if (msg.message?.imageMessage) {
      mediaMsg = msg.message.imageMessage
      tipo = 'image'
    } else if (msg.message?.videoMessage) {
      mediaMsg = msg.message.videoMessage
      tipo = 'video'
    }

    if (!mediaMsg) {
      return sock.sendMessage(
        jid,
        {
          text: `❌ Cita una imagen o un video corto (máx. ~10s), o envíalo junto con "${config.PREFIXES[0]}sticker" como descripción.`
        },
        { quoted: msg }
      )
    }

    const idTmp = `${Date.now()}-${Math.random().toString(36).slice(2)}`
    const entrada = path.join(os.tmpdir(), `sticker-in-${idTmp}.${tipo === 'video' ? 'mp4' : 'jpg'}`)
    const salida = path.join(os.tmpdir(), `sticker-out-${idTmp}.webp`)

    try {
      const buffer = await descargarMedia(mediaMsg, tipo)
      fs.writeFileSync(entrada, buffer)

      if (tipo === 'image') {
        await ejecutarFfmpeg([
          '-i', entrada,
          '-vf', "scale='min(512,iw)':'min(512,ih)':force_original_aspect_ratio=decrease,format=rgba,pad=512:512:(ow-iw)/2:(oh-ih)/2:color=#00000000",
          '-y', salida
        ])
      } else {
        await ejecutarFfmpeg([
          '-i', entrada,
          '-t', '10',
          '-vf', "fps=15,scale='min(512,iw)':'min(512,ih)':force_original_aspect_ratio=decrease,format=rgba,pad=512:512:(ow-iw)/2:(oh-ih)/2:color=#00000000",
          '-loop', '0',
          '-an',
          '-vsync', '0',
          '-y', salida
        ])
      }

      const img = new webpmux.Image()
      await img.load(salida)

      const exif = {
        'sticker-pack-id': `yuibot-md-${Date.now()}`,
        'sticker-pack-name': config.BOT_NAME,
        'sticker-pack-publisher': config.OWNERS?.[0]?.nombre || config.BOT_NAME,
        emojis: ['🥀'],
      }

      const exifAttr = Buffer.concat([
        Buffer.from([0x49, 0x49, 0x2a, 0x00, 0x08, 0x00, 0x00, 0x00, 0x01, 0x00, 0x41, 0x57, 0x07, 0x00]),
        Buffer.from([0, 0, 0, 0, 22, 0, 0, 0]),
        Buffer.from(JSON.stringify(exif)),
      ])

      img.exif = exifAttr
      await img.save(salida)

      const webpFinal = fs.readFileSync(salida)
      await sock.sendMessage(jid, { sticker: webpFinal }, { quoted: msg })

    } catch (error) {
      console.error('[STICKER]', error)
      await sock.sendMessage(
        jid,
        { text: `❌ No se pudo crear el sticker.\n\n> ${error.message || 'Error desconocido'}` },
        { quoted: msg }
      )
    } finally {
      for (const archivo of [entrada, salida]) {
        fs.unlink(archivo, () => {})
      }
    }
  },
}