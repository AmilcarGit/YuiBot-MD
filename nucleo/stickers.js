// Código Oficial de YuiBot-MD.by AmilcarGit
// Conversión de imágenes, videos y audios a stickers de WhatsApp con ffmpeg (WebP 512×512 + metadatos EXIF).
import { execFile } from 'child_process'
import crypto from 'crypto'
import fs from 'fs'
import os from 'os'
import path from 'path'

const LADO = 512
const MAX_FIJO = 300 * 1024
const MAX_ANIMADO = 950 * 1024
export const SEG_MAX = 8
export const SEG_SONIDO = 15 // los stickers con sonido pueden durar más; pesan más, así que se baja fps/calidad hasta que quepan

/** Última línea útil de lo que dijo ffmpeg (en vez del comando completo, que no le sirve a nadie). */
const motivoFfmpeg = stderr => {
  const t = String(stderr || '')
  if (/image data not found|Invalid data found/i.test(t)) return 'No pude leer ese archivo (¿es un sticker animado o un archivo dañado?).'
  const l = t.split('\n').map(x => x.trim()).filter(x => x && !/^\[.*\]\s*$/.test(x)).at(-1)
  return l ? `ffmpeg: ${l.slice(0, 160)}` : ''
}

const ejecutar = (cmd, args, timeout = 90000) => new Promise((resolver, rechazar) => {
  execFile(cmd, args, { timeout, maxBuffer: 1 << 22 }, (error, stdout, stderr) => (error ? rechazar(Object.assign(error, { stderr, message: motivoFfmpeg(stderr) || error.message })) : resolver(stdout)))
})

let ffmpegOk
export async function hayFfmpeg() {
  ffmpegOk ??= await ejecutar('ffmpeg', ['-version'], 8000).then(() => true, () => false)
  return ffmpegOk
}

async function conTemporal(fn) {
  const carpeta = fs.mkdtempSync(path.join(os.tmpdir(), 'yui-st-'))
  try { return await fn(carpeta) } finally { fs.rmSync(carpeta, { recursive: true, force: true }) }
}

/** Ajuste a 512×512: "completo" deja bordes transparentes; "recorte" llena el cuadro. */
const ajuste = modo => (modo === 'recorte'
  ? `scale=${LADO}:${LADO}:force_original_aspect_ratio=increase:flags=lanczos,crop=${LADO}:${LADO}`
  : `scale=${LADO}:${LADO}:force_original_aspect_ratio=decrease:flags=lanczos,pad=${LADO}:${LADO}:(ow-iw)/2:(oh-ih)/2:color=0x00000000`)

/** Imagen fija o animación (video/GIF) → WebP. Baja calidad y fps hasta que pese lo que WhatsApp admite. */
export async function aWebp(buffer, { animado = false, modo = 'completo', segundos = SEG_MAX, filtro = null, entrada = null } = {}) {
  return conTemporal(async dir => {
    const origen = path.join(dir, 'entrada')
    fs.writeFileSync(origen, buffer)
    const salida = path.join(dir, 'salida.webp')
    const maximo = animado ? MAX_ANIMADO : MAX_FIJO
    const todos = [[15, 60], [12, 45], [10, 35], [8, 25], [6, 18], [5, 12], [4, 8]]
    const pasos = animado ? (segundos > 10 ? todos.slice(2) : segundos > 8 ? todos.slice(1) : todos) : [[0, 75], [0, 55], [0, 35], [0, 20]]
    for (const [fps, calidad] of pasos) {
      const base = ['-y', '-hide_banner', '-loglevel', 'error', ...(entrada || ['-i', origen])]
      const cadena = filtro ? `${filtro},format=rgba` : `${animado ? `fps=${fps},` : ''}${ajuste(modo)},format=rgba`
      const args = filtro
        ? [...base, '-filter_complex', filtro.replaceAll('{fps}', String(fps)), '-t', String(segundos), '-an', '-c:v', 'libwebp', '-loop', '0', '-q:v', String(calidad), '-compression_level', '6', salida]
        : animado
          ? [...base, '-t', String(segundos), '-vf', cadena, '-an', '-c:v', 'libwebp', '-loop', '0', '-q:v', String(calidad), '-compression_level', '6', '-preset', 'default', salida]
          : [...base, '-frames:v', '1', '-vf', cadena, '-an', '-c:v', 'libwebp', '-q:v', String(calidad), '-compression_level', '6', '-preset', 'picture', salida]
      await ejecutar('ffmpeg', args)
      const datos = fs.readFileSync(salida)
      if (datos.length <= maximo) return datos
    }
    throw new Error('El sticker quedó demasiado pesado. Prueba con algo más corto o más simple.')
  })
}

/** Audio (o el audio de un video) → Opus en OGG, listo para el sticker con sonido. */
export async function aOpus(buffer, segundos = SEG_MAX) {
  return conTemporal(async dir => {
    const origen = path.join(dir, 'entrada'); const salida = path.join(dir, 'audio.ogg')
    fs.writeFileSync(origen, buffer)
    await ejecutar('ffmpeg', ['-y', '-hide_banner', '-loglevel', 'error', '-i', origen, '-vn', '-t', String(segundos), '-ar', '48000', '-ac', '1',
      '-c:a', 'libopus', '-b:a', '32k', '-vbr', 'on', '-compression_level', '10', '-frame_duration', '20', '-avoid_negative_ts', 'make_zero', salida])
    const datos = fs.readFileSync(salida)
    if (!datos.length) throw new Error('No encontré audio en ese archivo.')
    return datos
  })
}

/** Dura el archivo (segundos) según ffprobe; null si no se sabe. */
export async function duracion(buffer) {
  return conTemporal(async dir => {
    const origen = path.join(dir, 'entrada'); fs.writeFileSync(origen, buffer)
    const salida = await ejecutar('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', origen], 15000).catch(() => '')
    const n = Number(String(salida).trim())
    return Number.isFinite(n) && n > 0 ? n : null
  })
}

/** Animación hecha con la onda del audio: para los stickers con sonido que parten de un audio sin imagen. */
export function ondaDeAudio(buffer, segundos = SEG_MAX) {
  const filtro = '[0:a]showwaves=s=512x512:mode=cline:rate={fps}:colors=0xff69b4|0xc9a4ff[w];[w]colorkey=0x000000:0.12:0.0[k];color=c=0x331a31:s=512x512:r={fps}[bg];[bg][k]overlay=shortest=1,format=rgba'
  return aWebp(buffer, { animado: true, filtro, segundos })
}

// ── Metadatos (nombre del paquete y autor) dentro del WebP ───────────────────
const cortar = (t, n) => Array.from(String(t)).slice(0, n).join('')
function exif(pack, autor, emojis = ['🌸']) {
  const json = Buffer.from(JSON.stringify({
    'sticker-pack-id': crypto.randomBytes(16).toString('hex'),
    'sticker-pack-name': cortar(pack, 160),
    'sticker-pack-publisher': cortar(autor, 64),
    emojis
  }), 'utf8')
  const cabecera = Buffer.from([0x49, 0x49, 0x2a, 0x00, 0x08, 0x00, 0x00, 0x00, 0x01, 0x00, 0x41, 0x57, 0x07, 0x00, 0x00, 0x00, 0x00, 0x00, 0x16, 0x00, 0x00, 0x00])
  cabecera.writeUInt32LE(json.length, 14)
  return Buffer.concat([cabecera, json])
}

const chunk = (tipo, datos) => {
  const cab = Buffer.alloc(8); cab.write(tipo, 0, 'ascii'); cab.writeUInt32LE(datos.length, 4)
  return Buffer.concat([cab, datos, datos.length % 2 ? Buffer.alloc(1) : Buffer.alloc(0)])
}

function dimensiones(webp) {
  const tipo = webp.toString('ascii', 12, 16)
  if (tipo === 'VP8X') return { ancho: webp.readUIntLE(24, 3) + 1, alto: webp.readUIntLE(27, 3) + 1 }
  if (tipo === 'VP8L') { const b = webp.readUInt32LE(21); return { ancho: (b & 0x3fff) + 1, alto: ((b >> 14) & 0x3fff) + 1 } }
  if (tipo === 'VP8 ') return { ancho: webp.readUInt16LE(26) & 0x3fff, alto: webp.readUInt16LE(28) & 0x3fff }
  throw new Error('WebP no reconocido')
}

/** Agrega el nombre del paquete y el autor al sticker (así WhatsApp los muestra). */
export function conMetadatos(webp, pack, autor, emojis) {
  if (webp.toString('ascii', 0, 4) !== 'RIFF' || webp.toString('ascii', 8, 12) !== 'WEBP') throw new Error('No es un WebP')
  const trozos = []
  let pos = 12
  while (pos + 8 <= webp.length) {
    const tipo = webp.toString('ascii', pos, pos + 4); const largo = webp.readUInt32LE(pos + 4)
    const fin = pos + 8 + largo + (largo % 2)
    if (tipo !== 'EXIF') trozos.push({ tipo, datos: webp.subarray(pos + 8, pos + 8 + largo) })
    pos = fin
  }
  if (trozos[0]?.tipo !== 'VP8X') {
    const { ancho, alto } = dimensiones(webp)
    const vp8x = Buffer.alloc(10); vp8x.writeUIntLE(ancho - 1, 4, 3); vp8x.writeUIntLE(alto - 1, 7, 3)
    trozos.unshift({ tipo: 'VP8X', datos: vp8x })
  }
  trozos[0].datos = Buffer.from(trozos[0].datos); trozos[0].datos[0] |= 0x08
  const cuerpo = Buffer.concat([Buffer.from('WEBP'), ...trozos.map(t => chunk(t.tipo, t.datos)), chunk('EXIF', exif(pack, autor, emojis?.length ? emojis : undefined))])
  const cab = Buffer.alloc(8); cab.write('RIFF', 0, 'ascii'); cab.writeUInt32LE(cuerpo.length, 4)
  return Buffer.concat([cab, cuerpo])
}

/** Sticker (WebP fijo) → imagen PNG. Los stickers animados no se pueden leer con ffmpeg: se avisa con un error claro. */
export async function aPng(buffer) {
  return conTemporal(async dir => {
    const origen = path.join(dir, 'entrada.webp'); const salida = path.join(dir, 'imagen.png')
    fs.writeFileSync(origen, buffer)
    try {
      await ejecutar('ffmpeg', ['-y', '-hide_banner', '-loglevel', 'error', '-i', origen, '-frames:v', '1', salida])
    } catch {
      throw new Error('Ese sticker es animado y solo sé convertir stickers fijos a imagen.')
    }
    return fs.readFileSync(salida)
  })
}

/** Audio o video → MP3 (hasta `maxSeg` segundos). */
export async function aMp3(buffer, maxSeg = 600) {
  return conTemporal(async dir => {
    const origen = path.join(dir, 'entrada'); const salida = path.join(dir, 'audio.mp3')
    fs.writeFileSync(origen, buffer)
    await ejecutar('ffmpeg', ['-y', '-hide_banner', '-loglevel', 'error', '-i', origen, '-vn', '-t', String(maxSeg), '-c:a', 'libmp3lame', '-b:a', '128k', salida], 180000)
    const datos = fs.readFileSync(salida)
    if (!datos.length) throw new Error('No encontré audio en ese archivo.')
    return datos
  })
}

/** Letras en negrita cursiva (𝒀𝒖𝒊𝑩𝒐𝒕) para los títulos; lo demás queda igual. */
export const negritaCursiva = t => Array.from(String(t)).map(c => {
  const n = c.codePointAt(0)
  if (n >= 65 && n <= 90) return String.fromCodePoint(0x1d468 + n - 65)
  if (n >= 97 && n <= 122) return String.fromCodePoint(0x1d482 + n - 97)
  return c
}).join('')

/**
 * Firma profesional del sticker. El paquete (varias líneas) lleva el bot, quién lo pidió, dónde y cuándo;
 * el autor lleva al creador del bot. Si la persona escribió su propio paquete o autor (.s Nombre | Autor), se respeta.
 */
export function firmaSticker({ bot, creador = 'AmilcarGit', solicitante, lugar = '', tipo = 'sticker', segundos = null, pack = '', autor = '', zona = 'America/Lima', ahora = new Date() }) {
  const adorno = { sticker: ['✨', '🌸'], animado: ['🎞️', '🌸'], sonido: ['🎶', '🔊'] }[tipo] || ['✨', '🌸']
  const etiqueta = { sticker: 'Sticker', animado: 'Animado', sonido: 'Con sonido' }[tipo] || 'Sticker'
  const fecha = new Intl.DateTimeFormat('es', { day: '2-digit', month: '2-digit', year: '2-digit', timeZone: zona }).format(ahora)
  const lineas = [
    '╭─୨🌸୧─╮',
    `${adorno[0]} ${negritaCursiva(bot)} ✓`,
    `👤 Pedido por: ${solicitante || 'Usuario'}`,
    lugar ? `📍 Creado en: ${lugar}` : null,
    `📅 ${fecha} · ${adorno[1]} ${etiqueta}${segundos ? ` · ⏱ ${Math.round(segundos)}s` : ''}`,
    '╰─୨💖୧─╯'
  ].filter(Boolean)
  return {
    pack: pack ? `${adorno[0]} ${pack} ${adorno[0]}` : lineas.join('\n'),
    autor: autor || `👑 ${creador} ✓`,
    emojis: adorno
  }
}

/** ¿Es un WebP? (los stickers ya vienen listos: solo hace falta cambiarles la firma, sin recodificar) */
export const esWebp = b => b.length > 12 && b.toString('ascii', 0, 4) === 'RIFF' && b.toString('ascii', 8, 12) === 'WEBP'
