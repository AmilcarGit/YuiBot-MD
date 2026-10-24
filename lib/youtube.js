//CÓDIGO ORIGINAL DE YUIBOT-MD
const fetch = require('./http').fetchSeguro // timeout por defecto (ver lib/http.js)
const fs = require('fs')
const os = require('os')
const path = require('path')
const { spawn } = require('child_process')
const config = require('../defaults')
const { APIS } = config

// ── Descarga local con yt-dlp (gratis, sin APIs externas) ────────────────────
// Instalación en Termux:   pkg install yt-dlp ffmpeg      (o: pip install -U yt-dlp)
// Si YouTube cambia algo y deja de funcionar:   pip install -U yt-dlp
// Config en defaults.js → YOUTUBE: { MODO, BIN, MAX_MB, ALTURA }
//   MODO 'auto'  → yt-dlp primero, la API como respaldo (por defecto)
//   MODO 'local' → solo yt-dlp      MODO 'api' → solo la API de antes
function opcionesYoutube() {
  return { MODO: 'auto', BIN: 'yt-dlp', MAX_MB: 100, ALTURA: 720, ...(config.YOUTUBE || {}) }
}

function ejecutar(comando, argumentos, { timeoutMs = 5 * 60 * 1000 } = {}) {
  return new Promise((resolve, reject) => {
    const proceso = spawn(comando, argumentos, { stdio: ['ignore', 'pipe', 'pipe'] })
    let stdout = ''
    let stderr = ''
    const temporizador = setTimeout(() => {
      proceso.kill('SIGKILL')
      reject(new Error('yt-dlp tardó demasiado y se canceló'))
    }, timeoutMs)
    proceso.stdout.on('data', (d) => { stdout += d.toString() })
    proceso.stderr.on('data', (d) => { stderr += d.toString() })
    proceso.on('error', (error) => { clearTimeout(temporizador); reject(error) })
    proceso.on('close', (codigo) => {
      clearTimeout(temporizador)
      if (codigo === 0) return resolve({ stdout, stderr })
      reject(new Error(resumirErrorYtDlp(stderr) || `yt-dlp terminó con código ${codigo}`))
    })
  })
}

function resumirErrorYtDlp(stderr) {
  const lineas = String(stderr || '').split('\n').map((l) => l.trim()).filter(Boolean)
  const error = [...lineas].reverse().find((l) => l.startsWith('ERROR')) || lineas[lineas.length - 1] || ''
  return error.replace(/^ERROR:\s*(\[[^\]]+\]\s*)?/, '').slice(0, 300)
}

let cacheDisponible = null
async function ytDlpDisponible() {
  if (cacheDisponible && Date.now() - cacheDisponible.hora < 60000) return cacheDisponible.valor
  let valor = false
  try {
    await ejecutar(opcionesYoutube().BIN, ['--version'], { timeoutMs: 10000 })
    valor = true
  } catch {}
  cacheDisponible = { valor, hora: Date.now() }
  return valor
}

/** Orden en que se prueban las fuentes según MODO y si yt-dlp está instalado. */
function ordenDeFuentes(modo, hayYtDlp) {
  if (modo === 'api') return ['api']
  if (modo === 'local') return ['local']
  return hayYtDlp ? ['local', 'api'] : ['api']
}

function formatearDuracion(segundos) {
  if (!Number.isFinite(segundos) || segundos <= 0) return null
  const h = Math.floor(segundos / 3600)
  const m = Math.floor((segundos % 3600) / 60)
  const s = Math.floor(segundos % 60)
  return h ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}` : `${m}:${String(s).padStart(2, '0')}`
}

/** Convierte la salida de `yt-dlp --dump-json ytsearchN:` al mismo formato que la API. */
function parsearBusqueda(stdout) {
  const videos = []
  for (const linea of String(stdout || '').split('\n')) {
    if (!linea.trim().startsWith('{')) continue
    try {
      const v = JSON.parse(linea)
      if (!v.id) continue
      videos.push({
        title: v.title || 'Sin título',
        url: `https://www.youtube.com/watch?v=${v.id}`,
        channel: v.channel || v.uploader || 'Desconocido',
        duration: v.duration_string || formatearDuracion(v.duration) || 'Desconocida',
      })
    } catch {}
  }
  return { status: true, datos: { results: { videos } } }
}

async function buscarLocal(query) {
  const { BIN } = opcionesYoutube()
  const { stdout } = await ejecutar(BIN, ['--flat-playlist', '--dump-json', '--no-warnings', '--', `ytsearch5:${query}`], { timeoutMs: 60000 })
  const data = parsearBusqueda(stdout)
  if (!data.datos.results.videos.length) throw new Error('Sin resultados')
  return data
}

/**
 * Descarga con yt-dlp y devuelve el archivo en memoria.
 * @param {'audio'|'video'} tipo
 * @returns {Promise<{ buffer: Buffer, titulo: string, canal: string, duracion: string, calidad: string, archivo: string }>}
 */
async function descargarLocal(url, tipo) {
  const { BIN, MAX_MB, ALTURA } = opcionesYoutube()
  const carpeta = fs.mkdtempSync(path.join(os.tmpdir(), 'yui-yt-'))
  try {
    const comun = ['--no-playlist', '--no-warnings', '-q', '--print-json', '--max-filesize', `${MAX_MB}M`, '-o', path.join(carpeta, '%(id)s.%(ext)s')]
    const formato = tipo === 'audio'
      ? ['-f', 'bestaudio/best', '-x', '--audio-format', 'mp3', '--audio-quality', '0']
      : ['-f', `b[ext=mp4][height<=${ALTURA}]/bv*[height<=${ALTURA}][ext=mp4]+ba[ext=m4a]/b[height<=${ALTURA}]/b`, '--merge-output-format', 'mp4']

    const { stdout } = await ejecutar(BIN, [...comun, ...formato, '--', url])

    const lineas = stdout.split('\n').filter((l) => l.trim().startsWith('{'))
    const info = lineas.length ? JSON.parse(lineas[lineas.length - 1]) : {}
    const archivos = fs.readdirSync(carpeta).filter((f) => !f.endsWith('.part') && !f.endsWith('.ytdl'))
    if (!archivos.length) throw new Error(`El archivo supera el límite de ${MAX_MB} MB o no se pudo descargar`)
    const archivo = archivos.sort((a, b) => fs.statSync(path.join(carpeta, b)).size - fs.statSync(path.join(carpeta, a)).size)[0]
    const buffer = fs.readFileSync(path.join(carpeta, archivo))
    if (!buffer.length) throw new Error('El archivo descargado está vacío')

    return {
      buffer,
      titulo: info.title || 'youtube',
      canal: info.channel || info.uploader || 'Desconocido',
      duracion: info.duration_string || formatearDuracion(info.duration) || 'Desconocida',
      calidad: tipo === 'audio' ? '192 kbps' : (info.height ? `${info.height}p` : 'Desconocida'),
      archivo,
    }
  } finally {
    fs.rmSync(carpeta, { recursive: true, force: true })
  }
}

/** Prueba cada fuente en orden; `porFuente.local()` / `porFuente.api()` devuelven el resultado. */
async function conFuentes(porFuente) {
  const orden = ordenDeFuentes(opcionesYoutube().MODO, await ytDlpDisponible())
  const errores = []
  for (const fuente of orden) {
    try {
      return await porFuente[fuente]()
    } catch (error) {
      errores.push(`${fuente === 'local' ? 'yt-dlp' : 'API'}: ${error.message}`)
      console.log(`[YOUTUBE] Falló ${fuente}:`, error.message)
    }
  }
  const sinYtDlp = orden.includes('local') ? '' : ' (yt-dlp no está instalado: en Termux usa `pkg install yt-dlp ffmpeg`)'
  throw new Error(errores.join(' | ') + sinYtDlp)
}

const URL_VIDEO = 'https://api.lempi.lat/dl/ytv'
const URL_AUDIO = 'https://api.lempi.lat/dl/yta'
const URL_BUSQUEDA = 'https://api.lempi.lat/s/youtube'

function obtenerKeys() {
  return [APIS.LEMPI_KEY, APIS.LEMPI_KEY_2].filter(Boolean)
}

async function pedirConFallback(baseUrl, params, validar) {
  const keys = obtenerKeys()
  let ultimoError = null

  for (const key of keys) {
    try {
      const query = new URLSearchParams({ ...params, apikey: key })
      const resp = await fetch(`${baseUrl}?${query.toString()}`)
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`)

      const data = await resp.json()
      const error = validar(data)
      if (error) throw new Error(error)

      return data
    } catch (error) {
      ultimoError = error
      console.log('[YOUTUBE] Falló con una key, probando la siguiente si hay:', error.message)
    }
  }

  throw ultimoError || new Error('Ninguna API key funcionó')
}

function pedirVideo(url) {
  return pedirConFallback(URL_VIDEO, { url }, (data) => {
    if (!data?.status || !data?.datos?.url) return data?.message || data?.error || 'La API no devolvió el enlace de descarga'
    return null
  })
}

function pedirAudio(url) {
  return pedirConFallback(URL_AUDIO, { url }, (data) => {
    if (!data?.status || !data?.datos?.url) return data?.message || data?.error || 'La API no devolvió el enlace de descarga'
    return null
  })
}

function pedirBusquedaApi(query) {
  return pedirConFallback(URL_BUSQUEDA, { query }, (data) => {
    if (!data?.status || !data?.datos?.results?.videos?.length) return data?.message || data?.error || 'La API no devolvió resultados válidos'
    return null
  })
}

function pedirBusqueda(query) {
  return conFuentes({ local: () => buscarLocal(query), api: () => pedirBusquedaApi(query) })
}

module.exports = {
  pedirVideo,
  pedirAudio,
  pedirBusqueda,
  conFuentes,
  descargarLocal,
  ytDlpDisponible,
  _internos: { ordenDeFuentes, parsearBusqueda, formatearDuracion, resumirErrorYtDlp },
}