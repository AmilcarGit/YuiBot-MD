//CÓDIGO ORIGINAL DE YUIBOT-MD
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

async function crearStickerWebp(buffer, { animado = false, config } = {}) {
  const idTmp = `${Date.now()}-${Math.random().toString(36).slice(2)}`
  const entrada = path.join(os.tmpdir(), `stk-in-${idTmp}.${animado ? 'mp4' : 'jpg'}`)
  const salida = path.join(os.tmpdir(), `stk-out-${idTmp}.webp`)

  try {
    fs.writeFileSync(entrada, buffer)

    if (!animado) {
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

    const json = {
      'sticker-pack-id': `yuibot-md-${Date.now()}`,
      'sticker-pack-name': config.BOT_NAME,
      'sticker-pack-publisher': config.OWNERS?.[0]?.nombre || config.BOT_NAME,
      emojis: ['🥀'],
    }

    const jsonBuffer = Buffer.from(JSON.stringify(json), 'utf-8')
    const exifHeader = Buffer.from([
      0x49, 0x49, 0x2a, 0x00, 0x08, 0x00, 0x00, 0x00, 0x01, 0x00, 0x41, 0x57, 0x07, 0x00,
      0x00, 0x00, 0x00, 0x00, 0x16, 0x00, 0x00, 0x00
    ])
    const exif = Buffer.concat([exifHeader, jsonBuffer])
    exif.writeUIntLE(jsonBuffer.length, 14, 4)

    img.exif = exif
    await img.save(salida)

    return fs.readFileSync(salida)
  } finally {
    for (const archivo of [entrada, salida]) {
      fs.unlink(archivo, () => {})
    }
  }
}

module.exports = { crearStickerWebp }