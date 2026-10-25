// Cliente de la API gratuita de Delirius (https://api.delirius.online, sin token).
// Cada función devuelve el MISMO formato que usaban antes los módulos de descarga,
// así lib/youtube.js, lib/tiktok.js y lib/instagram.js solo cambian de proveedor.
const fetch = require('./http').fetchSeguro // timeout por defecto (ver lib/http.js)

const BASE = 'https://api.delirius.online'

async function pedir(ruta, params) {
  const resp = await fetch(`${BASE}${ruta}?${new URLSearchParams(params).toString()}`)
  if (!resp.ok) throw new Error(`Delirius respondió HTTP ${resp.status}`)
  const json = await resp.json()
  // La mayoría de endpoints responde en `data`; Pinterest lo hace en `results`.
  const datos = json?.data ?? json?.results
  if (!json?.status || datos === undefined || datos === null || datos === '') {
    throw new Error(json?.message || json?.error || 'Delirius no devolvió datos')
  }
  return datos
}

// ── YouTube ──
function adaptarBusqueda(lista) {
  const videos = (Array.isArray(lista) ? lista : [])
    .filter((v) => v?.url && (!v.type || v.type === 'video'))
    .map((v) => ({ title: v.title, url: v.url, channel: v.author?.name, duration: v.duration }))
  return { status: true, datos: { results: { videos } } }
}

async function buscarYoutube(query) {
  return adaptarBusqueda(await pedir('/search/ytsearch', { q: query }))
}

function adaptarYoutube(d, calidad) {
  const url = d?.download?.url || d?.download || d?.url
  if (typeof url !== 'string' || !url.startsWith('http')) throw new Error('Delirius no devolvió el enlace de descarga')
  return { status: true, titulo: d.title, canal: d.author, duracion: d.duration, datos: { url, calidad } }
}

async function audioYoutube(url) {
  return adaptarYoutube(await pedir('/download/ytmp3', { url }), '128 kbps')
}

async function videoYoutube(url) {
  return adaptarYoutube(await pedir('/download/ytmp4', { url }), 'Automática')
}

// ── TikTok ──
function adaptarTikTok(d) {
  const medio = d?.meta?.media?.[0]
  const url = medio?.hd && medio.hd !== '0' ? medio.hd : medio?.org || medio?.wm
  if (typeof url !== 'string' || !url.startsWith('http')) throw new Error('Delirius no devolvió el video de TikTok')
  return {
    status: true,
    titulo: d.title,
    region: d.region,
    autor: { nombre: d.author?.nickname, usuario: d.author?.username },
    estadisticas: { vistas: d.repro, likes: d.like },
    musica: undefined,
    portada: undefined,
    datos: { url, archivo: 'tiktok.mp4' },
  }
}

async function tiktok(url) {
  return adaptarTikTok(await pedir('/download/tiktok', { url }))
}

// ── Instagram ──
function adaptarMedios(d) {
  const lista = Array.isArray(d) ? d : d?.media || []
  const medio = lista.find((m) => m?.url)
  if (!medio) throw new Error('Delirius no devolvió el archivo')
  const tipo = medio.type === 'image' ? 'image' : 'video'
  return { tipo, url: medio.url }
}

async function instagram(url) {
  const { tipo, url: descarga } = adaptarMedios(await pedir('/download/instagram', { url }))
  return { ok: true, selected: { type: tipo, download_url: descarga, filename: tipo === 'video' ? 'instagram.mp4' : 'instagram.jpg' }, title: '', username: '' }
}

// ── Facebook ──
async function facebook(url) {
  const d = await pedir('/download/facebook', { url })
  const medio = (Array.isArray(d) ? d : [d]).find((m) => m?.url || m?.hd || m?.sd)
  const enlace = medio?.url || medio?.hd || medio?.sd
  if (typeof enlace !== 'string' || !enlace.startsWith('http')) throw new Error('Delirius no devolvió el video de Facebook')
  return { url: enlace, titulo: medio.title || 'Facebook' }
}

// ── Búsquedas y utilidades ──
function lista(d) {
  return Array.isArray(d) ? d : []
}

async function letra(query) {
  const d = await pedir('/search/lyrics', { query })
  if (!d?.lyrics || typeof d.lyrics !== 'string') throw new Error('No encontré la letra de esa canción')
  // Delirius repite el título de la página en title/artists/album: solo sirve el título.
  const titulo = String(d.title || query).replace(/\s*\((?:letra|lyrics)[^)]*\)\s*/i, '').trim()
  return { titulo, duracion: d.duration || '', letra: d.lyrics.trim() }
}

async function buscarSpotify(q) {
  const canciones = lista(await pedir('/search/spotify', { q })).filter((c) => c?.title)
  if (!canciones.length) throw new Error('Sin resultados en Spotify')
  return canciones.map((c) => ({ titulo: c.title, artista: c.artist, album: c.album, duracion: c.duration, publicado: c.publish, url: c.url, imagen: c.image }))
}

async function buscarSoundCloud(q) {
  const pistas = lista(await pedir('/search/soundcloud', { q })).filter((c) => c?.link)
  if (!pistas.length) throw new Error('Sin resultados en SoundCloud')
  return pistas.map((c) => ({ titulo: c.title, artista: c.artist, album: c.album, plays: c.play, likes: c.likes, imagen: c.image, url: c.link }))
}

async function buscarPinterest(text) {
  const urls = lista(await pedir('/search/pinterest', { text })).filter((u) => typeof u === 'string' && u.startsWith('http'))
  if (!urls.length) throw new Error('Sin resultados en Pinterest')
  return urls
}

async function buscarStickerly(query) {
  const packs = lista(await pedir('/search/stickerly', { query })).filter((p) => p?.url)
  if (!packs.length) throw new Error('Sin paquetes de stickers')
  return packs.map((p) => ({ titulo: p.name, autor: p.author, cantidad: p.sticker_count, url: p.url, preview: p.preview }))
}

async function paqueteStickerly(url) {
  const d = await pedir('/download/stickerly', { url })
  const stickers = lista(d.stickers).filter((u) => typeof u === 'string' && u.startsWith('http'))
  if (!stickers.length) throw new Error('El paquete no tiene stickers descargables')
  return { titulo: d.name, autor: d.author, animado: Boolean(d.isAnimated), stickers }
}

async function captura(url) {
  const d = await pedir('/tools/ssweb', { url })
  if (typeof d?.download !== 'string' || !d.download.startsWith('http')) throw new Error('Delirius no devolvió la captura')
  return d.download
}

async function chatgpt(q) {
  const d = await pedir('/ia/chatgpt', { q })
  if (typeof d !== 'string' || !d.trim()) throw new Error('La IA no devolvió una respuesta')
  return d.trim()
}

module.exports = {
  letra,
  buscarSpotify,
  buscarSoundCloud,
  buscarPinterest,
  buscarStickerly,
  paqueteStickerly,
  captura,
  chatgpt,
  buscarYoutube,
  audioYoutube,
  videoYoutube,
  tiktok,
  instagram,
  facebook,
  _internos: { adaptarBusqueda, adaptarYoutube, adaptarTikTok, adaptarMedios },
}
