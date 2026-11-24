// Código Oficial de YuiBot-MD.by AmilcarGit
// Cliente de las APIs de descargas (Nexora para búsqueda y MP3, YOSOYO para MP4).
// Las claves y URLs salen de ajustes.js.
import { execFile } from 'child_process'
import fs from 'fs'
import os from 'os'
import path from 'path'
import ajustes from '../ajustes.js'

const pausa = ms => new Promise(r => setTimeout(r, ms))

// Las APIs gratuitas fallan a ratos ("Error al consultar YouTube"): se intenta una segunda vez.
async function pedir(base, ruta, params, intentos = 2) {
  const url = new URL(ruta, base.url)
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v)
  let ultimo
  for (let i = 0; i < intentos; i++) {
    try {
      const respuesta = await fetch(url, { signal: AbortSignal.timeout(ajustes.descargas.espera) })
      const datos = await respuesta.json().catch(() => ({}))
      if (!respuesta.ok) throw new Error(datos.message || datos.error || `API ${respuesta.status}`)
      if (datos.status === false) throw new Error(datos.message || 'la API no pudo con esto')
      return datos
    } catch (error) {
      ultimo = error
      if (i < intentos - 1) await pausa(1200)
    }
  }
  throw ultimo
}

const primero = (...valores) => valores.find(v => typeof v === 'string' && /^https?:\/\//.test(v)) || null

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

/** Busca videos en YouTube: primero YOSOYO y, si falla o no trae nada, Nexora. */
export async function buscarYoutube(consulta, limite = 6) {
  let ultimo
  for (const buscar of [buscarYosoyo, buscarNexora]) {
    try {
      const lista = await buscar(consulta, limite)
      if (lista.length) return lista
    } catch (error) { ultimo = error }
  }
  if (ultimo) throw ultimo
  return []
}

/** Enlace de descarga del audio (MP3) de un video de YouTube. */
export async function ytmp3(enlace) {
  const { nexora } = ajustes.descargas
  const r = await pedir(nexora, '/api/descargas/ytmp3', { url: enlace, apikey: nexora.clave })
  const url = primero(r.data?.download)
  if (!url) throw new Error('sin enlace de audio')
  return url
}

/** Enlace de descarga del video (MP4) y datos básicos. */
export async function ytmp4(enlace) {
  const { nexora, yosoyo } = ajustes.descargas
  let motivo
  // 1) Nexora: el parámetro es format=360p (si no sale, 480p); 2) YOSOYO como respaldo.
  for (const formato of ['360p', '480p']) {
    try {
      const r = await pedir(nexora, '/api/descargas/ytmp4', { url: enlace, format: formato, apikey: nexora.clave }, 1)
      const url = primero(r.data?.download, r.data?.url, r.data?.mp4, typeof r.data === 'string' ? r.data : '')
      if (url) return { url, titulo: r.data?.title || '', miniatura: '' }
      motivo = 'Nexora no devolvió enlace'
    } catch (error) { motivo = error.message }
  }
  try {
    const r = await pedir(yosoyo, '/api/youtube', { q: enlace, apiKey: yosoyo.clave }, 1)
    const v = r.result?.[0]
    const url = primero(v?.downloads?.mp4?.url, v?.download?.mp4, v?.downloads?.mixed?.mp4, v?.downloads?.v2?.download?.mp4)
    if (url) return { url, titulo: v.title || '', miniatura: v.thumbnailUrl || '' }
  } catch { /* se informa el motivo de la primera */ }
  throw new Error(motivo || 'sin enlace de video')
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
