// Código Oficial de YuiBot-MD.by AmilcarGit
// Cliente de las APIs de descargas (Nexora para búsqueda y MP3, YOSOYO para MP4).
// Las claves y URLs salen de ajustes.js.
import { execFile } from 'child_process'
import fs from 'fs'
import os from 'os'
import path from 'path'
import { AsyncLocalStorage } from 'async_hooks'
import ajustes from '../ajustes.js'
import { cnvConvert, CNV_SERVERS, CNV_USER_AGENT } from './cnv.js'

// Presupuesto de tiempo por comando (la web corre en funciones con límite de 60 s): ninguna petición puede pasarse de lo que queda.
const presupuesto = new AsyncLocalStorage()
export const conPresupuesto = (ms, fn) => presupuesto.run({ fin: Date.now() + ms }, fn)
const restante = () => { const p = presupuesto.getStore(); return p ? p.fin - Date.now() : Infinity }
const plazo = max => {
  const r = restante()
  if (r < 1500) throw new Error('Se acabó el tiempo disponible; intenta de nuevo en un momento')
  return AbortSignal.timeout(Math.min(max, r - 500))
}

const pausa = ms => new Promise(r => setTimeout(r, ms))

// Las APIs gratuitas fallan a ratos ("Error al consultar YouTube"): se intenta una segunda vez.
async function pedir(base, ruta, params, intentos = 2) {
  const url = new URL(ruta, base.url)
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v)
  let ultimo
  for (let i = 0; i < intentos; i++) {
    try {
      const respuesta = await fetch(url, { signal: plazo(ajustes.descargas.espera) })
      const datos = await respuesta.json().catch(() => ({}))
      if (!respuesta.ok) throw new Error(datos.message || datos.error || `API ${respuesta.status}`)
      if (datos.status === false) throw new Error(datos.message || 'la API no pudo con esto')
      return datos
    } catch (error) {
      ultimo = error
      if (i < intentos - 1 && restante() > 8000) await pausa(1200)
      else break
    }
  }
  throw ultimo
}

const primero = (...valores) => valores.find(v => typeof v === 'string' && /^https?:\/\//.test(v)) || null

/** Búsqueda con la API oficial de YuiBot-MD (YuiApi). */
async function buscarYuiapi(consulta, limite) {
  const { yuiapi } = ajustes.descargas
  const url = new URL('/api/v1/search/youtube', yuiapi.url)
  url.searchParams.set('q', consulta); url.searchParams.set('limit', String(Math.min(limite, 10)))
  const respuesta = await fetch(url, { headers: { 'x-api-key': yuiapi.clave }, signal: plazo(ajustes.descargas.espera) })
  const datos = await respuesta.json().catch(() => ({}))
  if (!respuesta.ok || datos.ok === false) throw new Error(datos.error || datos.message || `YuiApi ${respuesta.status}`)
  return (datos.results || [])
    .filter(v => /^https?:\/\//.test(v.url || '') && v.duration)
    .slice(0, limite)
    .map(v => ({ url: v.url, titulo: v.title, duracion: v.duration, canal: v.channel, vistas: v.views, miniatura: v.id ? `https://i.ytimg.com/vi/${v.id}/hqdefault.jpg` : v.thumbnail }))
}

/** Audio MP3 de YuiApi: la API entrega el archivo, no un enlace. Devuelve un Buffer. */
export async function ytaudioYui(enlace) {
  const { yuiapi, maxAudioBytes } = ajustes.descargas
  const url = new URL('/api/v1/download/ytaudio', yuiapi.url)
  url.searchParams.set('url', enlace)
  const respuesta = await fetch(url, { headers: { 'x-api-key': yuiapi.clave }, signal: plazo(ajustes.descargas.audioMs || 60000) })
  if (!respuesta.ok) throw new Error(`YuiApi ${respuesta.status}`)
  if (/json|text/.test(respuesta.headers.get('content-type') || '')) throw new Error('YuiApi no devolvió audio')
  const largo = Number(respuesta.headers.get('content-length') || 0)
  if (largo > maxAudioBytes) throw new Error('el audio pesa demasiado')
  const buffer = Buffer.from(await respuesta.arrayBuffer())
  if (!buffer.length || buffer.length > maxAudioBytes) throw new Error('audio vacío o demasiado pesado')
  return buffer
}

/** Video MP4 de YuiApi (la API entrega el archivo, no un enlace). Devuelve un Buffer; 360p por defecto, que pesa poco y trae audio. */
export async function ytvideoYui(enlace, { calidad = '360', maxBytes = 60 * 1024 * 1024 } = {}) {
  const { yuiapi } = ajustes.descargas
  const url = new URL('/api/v1/download/ytvideo', yuiapi.url)
  url.searchParams.set('url', enlace); url.searchParams.set('quality', calidad)
  const respuesta = await fetch(url, { headers: { 'x-api-key': yuiapi.clave }, signal: plazo(ajustes.descargas.audioMs || 60000) })
  if (!respuesta.ok) throw new Error(`YuiApi ${respuesta.status}`)
  if (/json|text/.test(respuesta.headers.get('content-type') || '')) throw new Error('YuiApi no devolvió video')
  if (Number(respuesta.headers.get('content-length') || 0) > maxBytes) throw new Error('el video pesa demasiado')
  const buffer = Buffer.from(await respuesta.arrayBuffer())
  if (!buffer.length) throw new Error('video vacío')
  if (buffer.length > maxBytes) throw new Error('el video pesa demasiado')
  return buffer
}

/** Búsqueda con YOSOYO (sin cuota diaria). Mismo formato de salida que buscarYoutube. */
async function buscarYosoyo(consulta, limite) {
  const { yosoyo } = ajustes.descargas
  const r = await pedir(yosoyo, '/api/youtube', { q: consulta, apiKey: yosoyo.clave }, 1)
  return (r.result || [])
    .filter(v => /^https?:\/\//.test(v.videoUrl || '') && v.duration)
    .slice(0, limite)
    .map(v => ({ url: v.videoUrl, titulo: v.title, duracion: v.duration, canal: v.channelName, vistas: v.views, miniatura: v.thumbnailUrl }))
}

/** Búsqueda con Nexora (150 peticiones al día en la clave gratuita). */
async function buscarNexora(consulta, limite) {
  const { nexora } = ajustes.descargas
  const r = await pedir(nexora, '/api/busqueda/youtube', { query: consulta, apikey: nexora.clave })
  return (r.data || [])
    .filter(v => v.type === 'video' && v.url && !v.isLive)
    .slice(0, limite)
    .map(v => ({ url: v.url, titulo: v.title, duracion: v.duration, canal: v.author?.name, vistas: v.views, miniatura: v.thumbnail || v.image }))
}

/** Busca videos en YouTube: primero YuiApi (oficial) y, si falla o no trae nada, YOSOYO y Nexora. */
export async function buscarYoutube(consulta, limite = 6) {
  let ultimo
  for (const buscar of [buscarYuiapi, buscarYosoyo, buscarNexora]) {
    try {
      const lista = await buscar(consulta, limite)
      if (lista.length) return lista
    } catch (error) { ultimo = error }
  }
  if (ultimo) throw ultimo
  return []
}

/** Enlaces de descarga de la API v2 de YOSOYO: [{ download, quality, type, extension }]. */
async function opcionesV2(enlace, formato) {
  const { yosoyo } = ajustes.descargas
  const r = await pedir(yosoyo, '/api/youtube/v2', { url: enlace, format: formato, apiKey: yosoyo.clave }, 1)
  return (r.result?.results || []).filter(o => /^https?:\/\//.test(o.download || ''))
}

export const esEnlaceFacebook = t => /^https?:\/\/((www|m|web|mbasic|fb)\.)?(facebook\.com|fb\.watch|fb\.com)\//i.test(String(t || '').trim())

/** Video de Facebook con YOSOYO (/api/facebook): devuelve enlaces HD y SD directos, y el título. */
export async function facebookVideo(enlace) {
  const { yosoyo } = ajustes.descargas
  const r = await pedir(yosoyo, '/api/facebook', { url: enlace, apiKey: yosoyo.clave }, 2)
  const res = r.result || {}
  const hd = primero(res.media?.video_hd, ...Object.values(res.links || {}))
  const sd = primero(res.media?.video_sd, res.media?.video_hd, res.url)
  if (!hd && !sd) throw new Error('Facebook no me dio el video: ¿es público y es un video o reel?')
  const titulo = [res.title, res.info?.title].find(t => t && !/^sin t[ií]tulo$/i.test(t)) || ''
  return { hd: hd || sd, sd: sd || hd, titulo: String(titulo).slice(0, 120) }
}

/** Enlace de descarga del audio de un video de YouTube: Nexora (MP3) y, si falla, YOSOYO v2 (M4A). */
export async function ytmp3(enlace) {
  const { nexora } = ajustes.descargas
  let motivo
  try {
    const r = await pedir(nexora, '/api/descargas/ytmp3', { url: enlace, apikey: nexora.clave })
    const url = primero(r.data?.download)
    if (url) return url
    motivo = 'sin enlace de audio'
  } catch (error) { motivo = error.message }
  try {
    const m4a = (await opcionesV2(enlace, 'mp3')).find(o => o.type === 'audio' && o.extension === 'm4a')
    if (m4a) return m4a.download
  } catch { /* se informa el motivo de Nexora */ }
  throw new Error(motivo)
}

/** Enlace de descarga del video (MP4) y datos básicos. */
export async function ytmp4(enlace) {
  const { nexora, yosoyo } = ajustes.descargas
  // Los proveedores fallan a ratos: se prueban a la vez (gana el primero que responde) y, si todos fallan, se reintenta una vez.
  const intentos = [
    async () => {
      const videos = (await opcionesV2(enlace, 'mp4')).filter(o => o.type === 'video' && o.extension === 'mp4')
      // El 360p es el único que trae audio (los demás son solo imagen).
      const elegido = ['360p', '480p', '240p', '720p', '144p'].map(q => videos.find(o => o.quality === q)).find(Boolean)
      if (!elegido) throw new Error('YOSOYO no devolvió video')
      return { url: elegido.download, titulo: '', miniatura: '', conAudio: elegido.quality === '360p' }
    },
    ...['360p', '480p'].map(formato => async () => {
      const r = await pedir(nexora, '/api/descargas/ytmp4', { url: enlace, format: formato, apikey: nexora.clave }, 1)
      const url = primero(r.data?.download, r.data?.url, r.data?.mp4, typeof r.data === 'string' ? r.data : '')
      if (!url) throw new Error('Nexora no devolvió enlace')
      return { url, titulo: r.data?.title || '', miniatura: '' }
    }),
    async () => {
      const r = await pedir(yosoyo, '/api/youtube', { q: enlace, apiKey: yosoyo.clave }, 1)
      const v = r.result?.[0]
      const url = primero(v?.downloads?.mp4?.url, v?.download?.mp4, v?.downloads?.mixed?.mp4, v?.downloads?.v2?.download?.mp4)
      if (!url) throw new Error('sin enlace de video')
      return { url, titulo: v.title || '', miniatura: v.thumbnailUrl || '' }
    }
  ]
  let motivo
  for (let ronda = 0; ronda < 2; ronda++) {
    try { return await Promise.any(intentos.map(f => f())) } catch (error) { motivo = error.errors?.[1]?.message || error.errors?.[0]?.message || error.message }
  }
  throw new Error(motivo || 'sin enlace de video')
}

// ── CNV (cnv.cx): convierte YouTube a MP3/MP4 y entrega el archivo; se descarga aquí porque pide Origin/Referer ──
const conPlazo = (promesa, senal) => Promise.race([promesa, new Promise((_, no) => senal.addEventListener('abort', () => no(new Error('cnv: se acabó el tiempo')), { once: true }))])

async function bajarCnv(info, maxBytes, senal) {
  const servidor = CNV_SERVERS.find(x => x.name === info.provider) || CNV_SERVERS[0]
  const r = await fetch(info.url, { headers: { Accept: '*/*', Origin: servidor.origin, Referer: servidor.referer, 'User-Agent': CNV_USER_AGENT }, redirect: 'follow', signal: senal })
  if (!r.ok) throw new Error(`cnv: la descarga respondió ${r.status}`)
  if (Number(r.headers.get('content-length') || 0) > maxBytes) throw new Error('cnv: el archivo es demasiado grande')
  const buffer = Buffer.from(await conPlazo(r.arrayBuffer(), senal))
  if (!buffer.length) throw new Error('cnv: archivo vacío')
  if (buffer.length > maxBytes) throw new Error('cnv: el archivo es demasiado grande')
  return buffer
}

/** Descarga un video de YouTube como archivo ('mp3' o 'mp4') usando cnv.cx. Devuelve { buffer, titulo, mimetype }. */
export async function cnvYoutube(enlace, formato, { maxBytes = 16 * 1024 * 1024 } = {}) {
  const senal = plazo(formato === 'mp3' ? 30000 : 45000)
  const carga = formato === 'mp3'
    ? { link: enlace, format: 'mp3', audioBitrate: '128', filenameStyle: 'basic' }
    : { link: enlace, format: 'mp4', videoQuality: '480', filenameStyle: 'basic', vCodec: 'h264' }
  const info = await conPlazo(cnvConvert(carga), senal)
  if (!/^https?:\/\//.test(info?.url || '')) throw new Error('cnv: sin enlace de descarga')
  const buffer = await bajarCnv(info, maxBytes, senal)
  const mimetype = formato === 'mp4' ? 'video/mp4' : buffer.subarray(4, 8).toString() === 'ftyp' ? 'audio/mp4' : 'audio/mpeg'
  return { buffer, mimetype, titulo: String(info.filename || '').replace(/\.[a-z0-9]{2,4}$/i, '').slice(0, 100) }
}

export const esEnlaceYoutube = t => /^(https?:\/\/)?(www\.|m\.|music\.)?(youtube\.com|youtu\.be)\//i.test(t || '')

/** Una descarga a la vez por persona. */
const ocupados = new Set()
export const tomar = clave => (ocupados.has(clave) ? false : (ocupados.add(clave), true))
export const soltar = clave => ocupados.delete(clave)

/** Motivo corto y legible del error para mostrarlo en el chat. */
export const motivo = error => String(error?.message || error || 'error desconocido').replace(/https?:\/\/\S+/g, '').slice(0, 120)

// ── Descarga local con yt-dlp (la más fiable: usa la conexión del propio teléfono o servidor) ──
// Instalación en Termux:  pkg install python ffmpeg && pip install -U yt-dlp
const ejecutar = (cmd, args, opciones = {}) => new Promise((resolve, reject) => {
  execFile(cmd, args, { timeout: 180000, maxBuffer: 1 << 20, ...opciones }, (error, stdout, stderr) => error ? reject(Object.assign(error, { stderr })) : resolve(stdout))
})

let ytdlpDisponible
/** true si yt-dlp está instalado (se comprueba una vez). */
export async function hayYtdlp() {
  if (ytdlpDisponible === undefined) ytdlpDisponible = await ejecutar('yt-dlp', ['--version'], { timeout: 10000 }).then(() => true, () => false)
  return ytdlpDisponible
}

/**
 * Descarga el video (360p/480p en MP4, con audio) a un archivo temporal.
 * Devuelve { archivo, titulo } o null si yt-dlp no está instalado. Quien lo use debe borrar el archivo.
 */
export async function ytmp4Local(enlace, { maxMb = 60 } = {}) {
  if (!(await hayYtdlp())) return null
  const carpeta = fs.mkdtempSync(path.join(os.tmpdir(), 'yui-'))
  try {
    const salida = await ejecutar('yt-dlp', [
      '--no-playlist', '--no-warnings', '--max-filesize', `${maxMb}M`,
      '-f', '18/best[height<=480][ext=mp4]/best[height<=480]/worst[ext=mp4]',
      '--merge-output-format', 'mp4',
      '-o', path.join(carpeta, '%(id)s.%(ext)s'),
      '--print', '%(title)s', '--print', 'after_move:filepath', '--no-simulate',
      enlace
    ])
    const [titulo, archivo] = salida.trim().split('\n').slice(-2)
    if (!archivo || !fs.existsSync(archivo)) throw new Error('el video supera el límite o no se pudo bajar')
    return { archivo, titulo: titulo || '', carpeta }
  } catch (error) {
    fs.rmSync(carpeta, { recursive: true, force: true })
    throw new Error(String(error.stderr || error.message).split('\n').filter(Boolean).pop()?.slice(0, 120) || 'yt-dlp falló')
  }
}

/** Borra el archivo temporal de una descarga local. */
export const limpiarLocal = d => d?.carpeta && fs.rmSync(d.carpeta, { recursive: true, force: true })
