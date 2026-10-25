// Cliente de la API gratuita de Delirius (https://api.delirius.online, sin token).
// Cada función devuelve el MISMO formato que usaban antes los módulos de descarga,
// así lib/youtube.js, lib/tiktok.js y lib/instagram.js solo cambian de proveedor.
const fetch = require('./http').fetchSeguro // timeout por defecto (ver lib/http.js)

const BASE = 'https://api.delirius.online'

async function pedir(ruta, params) {
  const resp = await fetch(`${BASE}${ruta}?${new URLSearchParams(params).toString()}`)
  if (!resp.ok) throw new Error(`Delirius respondió HTTP ${resp.status}`)
  const json = await resp.json()
  if (!json?.status || !json?.data) throw new Error(json?.message || json?.error || 'Delirius no devolvió datos')
  return json.data
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

module.exports = {
  buscarYoutube,
  audioYoutube,
  videoYoutube,
  tiktok,
  instagram,
  facebook,
  _internos: { adaptarBusqueda, adaptarYoutube, adaptarTikTok, adaptarMedios },
}
