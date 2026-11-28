// Código Oficial de YuiBot-MD.by AmilcarGit
// API de Delirius (gratis, sin clave): texto a voz, capturas web, GIFs de reacción, descargas de redes y música.
// Todas las respuestas pasan por `delirius()`, que valida el estado y da un error claro en español.

const BASE = () => (process.env.DELIRIUS_URL || 'https://api.delirius.online').replace(/\/$/, '')

export async function delirius(ruta, params = {}, { ms = 25000 } = {}) {
  const consulta = new URLSearchParams(Object.entries(params).filter(([, v]) => v !== undefined && v !== ''))
  const r = await fetch(`${BASE()}${ruta}${consulta.size ? `?${consulta}` : ''}`, { signal: AbortSignal.timeout(ms), headers: { 'User-Agent': 'YuiBot-MD/1.0 (https://github.com/AmilcarGit/YuiBot-MD)' } })
  let d = null
  try { d = await r.json() } catch {}
  const msg = typeof d === 'string' ? d : d?.msg || d?.message || d?.error
  if (!r.ok || d == null || typeof d === 'string' || d.status === false || d.found === false) throw new Error(msg || `Delirius respondió HTTP ${r.status}`)
  return d
}

/** Descarga un archivo pequeño a memoria (para mandarlo como nota de voz o incrustarlo en la web). */
export async function bajar(url, maxBytes = 8 * 1024 * 1024) {
  const r = await fetch(url, { signal: AbortSignal.timeout(30000), headers: { 'User-Agent': 'YuiBot-MD/1.0' } })
  if (!r.ok) throw new Error(`No pude bajar el archivo (HTTP ${r.status})`)
  const largo = Number(r.headers.get('content-length') || 0)
  if (largo > maxBytes) throw new Error('El archivo pesa demasiado')
  const b = Buffer.from(await r.arrayBuffer())
  if (b.length > maxBytes) throw new Error('El archivo pesa demasiado')
  return b
}

const duracionTexto = seg => { const s = Math.round(seg); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}` }

// ── Texto a voz ─────────────────────────────────────────────────────────────────────
export const MAX_TTS = 300
export async function textoAVoz(texto, idioma = 'es') {
  const d = await delirius('/tools/gtts', { text: String(texto).slice(0, MAX_TTS), language: idioma })
  const url = d.data?.download
  if (!/^https?:\/\//.test(url || '')) throw new Error('No me dieron el audio')
  return url
}

// ── Captura de una página web ───────────────────────────────────────────────────────
export function normalizarWeb(texto) {
  let t = String(texto || '').trim()
  if (!t || /\s/.test(t)) return null
  if (!/^https?:\/\//i.test(t)) t = `https://${t}`
  try {
    const u = new URL(t)
    if (!/^https?:$/.test(u.protocol) || !u.hostname.includes('.') || /^(localhost|127\.|10\.|192\.168\.|169\.254\.)/.test(u.hostname)) return null
    return u.href
  } catch { return null }
}
export async function capturaWeb(enlace) {
  const d = await delirius('/tools/ssweb', { url: enlace }, { ms: 45000 })
  const url = d.data?.download
  if (!/^https?:\/\//.test(url || '')) throw new Error('No me dieron la captura')
  return url
}

// ── GIFs de anime para reaccionar ───────────────────────────────────────────────────
// `solo`: no necesita a nadie más. `{t}` se cambia por la persona (o "todos").
export const REACCIONES = {
  hug: { es: ['abrazo', 'abrazar'], emoji: '🤗', frase: 'abrazó a {t}' },
  kiss: { es: ['beso', 'besar'], emoji: '😘', frase: 'besó a {t}' },
  pat: { es: ['caricia', 'acariciar'], emoji: '🥰', frase: 'acarició a {t}' },
  cuddle: { es: ['acurrucar'], emoji: '🫂', frase: 'se acurrucó con {t}' },
  handhold: { es: ['mano', 'tomarmano'], emoji: '🤝', frase: 'tomó de la mano a {t}' },
  highfive: { es: ['chocalos', 'cinco'], emoji: '🙌', frase: 'chocó los cinco con {t}' },
  poke: { es: ['picar'], emoji: '👉', frase: 'picó a {t}' },
  tickle: { es: ['cosquillas'], emoji: '🤭', frase: 'le hizo cosquillas a {t}' },
  wink: { es: ['guiño', 'guino'], emoji: '😉', frase: 'le guiñó el ojo a {t}' },
  nom: { es: ['mordisco'], emoji: '😋', frase: 'mordisqueó a {t}' },
  glomp: { es: ['lanzarabrazo'], emoji: '💞', frase: 'se lanzó a abrazar a {t}' },
  bite: { es: ['morder'], emoji: '😬', frase: 'mordió a {t}' },
  lick: { es: ['lamer'], emoji: '👅', frase: 'lamió a {t}' },
  slap: { es: ['bofetada', 'cachetada'], emoji: '👋', frase: 'le dio una bofetada a {t}' },
  kick: { es: ['patada', 'patear'], emoji: '🦶', frase: 'pateó a {t}' },
  bonk: { es: ['golpecito'], emoji: '🔨', frase: 'le dio un bonk a {t}' },
  bully: { es: ['molestar'], emoji: '😈', frase: 'molestó a {t}' },
  yeet: { es: ['lanzar'], emoji: '🚀', frase: 'lanzó por los aires a {t}' },
  kill: { es: ['matar'], emoji: '🔪', frase: 'mandó al más allá a {t}' },
  cry: { es: ['llorar'], emoji: '😭', frase: 'está llorando', solo: true },
  dance: { es: ['bailar', 'baile'], emoji: '💃', frase: 'se puso a bailar', solo: true },
  happy: { es: ['feliz'], emoji: '😄', frase: 'está muy feliz', solo: true },
  smile: { es: ['sonreir', 'sonrisa'], emoji: '😊', frase: 'sonríe', solo: true },
  blush: { es: ['sonrojo', 'sonrojar'], emoji: '😳', frase: 'se sonrojó', solo: true },
  pout: { es: ['puchero'], emoji: '😤', frase: 'hace puchero', solo: true },
  smug: { es: ['presumir'], emoji: '😏', frase: 'se siente presumido', solo: true },
  cringe: { es: ['cringe'], emoji: '😬', frase: 'siente cringe', solo: true },
  angry: { es: ['enojo', 'enojar'], emoji: '😠', frase: 'está muy enojado', solo: true }
}
const INDICE_REACCION = new Map()
for (const [api, r] of Object.entries(REACCIONES)) for (const n of [api, ...r.es]) INDICE_REACCION.set(n, api)
export const nombresReaccion = () => [...INDICE_REACCION.keys()]
export const reaccionDe = palabra => INDICE_REACCION.get(String(palabra || '').toLowerCase()) || null

export async function reaccionGif(nombre) {
  const d = await delirius(`/reactions/${nombre}`)
  const url = d.data?.url
  if (!/^https?:\/\//.test(url || '')) throw new Error('No me dieron el GIF')
  return url
}

// ── Descargas de redes sociales ─────────────────────────────────────────────────────
export const REDES = {
  tiktok: { nombre: 'TikTok', emoji: '🎵', rutas: ['/download/tiktok'], esEnlace: t => /^https?:\/\/((www|m|vm|vt)\.)?tiktok\.com\//i.test(t) },
  instagram: { nombre: 'Instagram', emoji: '📸', rutas: ['/download/instagram', '/download/instagramv2'], esEnlace: t => /^https?:\/\/(www\.)?instagram\.com\//i.test(t) },
  twitter: { nombre: 'X (Twitter)', emoji: '🐦', rutas: ['/download/twitter', '/download/twitterdl'], esEnlace: t => /^https?:\/\/((www|mobile)\.)?(twitter|x)\.com\//i.test(t) },
  threads: { nombre: 'Threads', emoji: '🧵', rutas: ['/download/threads'], esEnlace: t => /^https?:\/\/(www\.)?threads\.(net|com)\//i.test(t) }
}

const PRIORIDAD = ['hd', 'url', 'download', 'org', 'src', 'link', 'sd', 'wm']
const IGNORAR = /thumb|avatar|profile|cover|preview|icon|poster/i
const tipoDe = (url, clave) => /\.(jpe?g|png|webp|gif)(\?|$)/i.test(url) || /image|photo|img/i.test(clave) ? 'image' : /\.(mp3|m4a|ogg)(\?|$)/i.test(url) || /audio|music/i.test(clave) ? 'audio' : 'video'

/** Busca enlaces de archivos en cualquier forma de respuesta; de cada objeto toma una sola calidad (la mejor). */
export function extraerMedios(dato, limite = 10) {
  const medios = []; const vistos = new Set()
  const agregar = (url, clave) => { if (!vistos.has(url) && medios.length < limite) { vistos.add(url); medios.push({ tipo: tipoDe(url, clave), url }) } }
  const visitar = (v, clave = '') => {
    if (typeof v === 'string') { if (/^https?:\/\//i.test(v) && !IGNORAR.test(clave) && /url|download|link|hd|sd|org|video|image|src|media|data/i.test(clave)) agregar(v, clave); return }
    if (Array.isArray(v)) return v.forEach(x => visitar(x, clave))
    if (!v || typeof v !== 'object') return
    const mejor = PRIORIDAD.find(k => typeof v[k] === 'string' && /^https?:\/\//i.test(v[k]) && !IGNORAR.test(k))
    if (mejor) agregar(v[mejor], v.type === 'image' ? 'image' : mejor)
    for (const [k, x] of Object.entries(v)) if (typeof x === 'object' || (!mejor && typeof x === 'string')) visitar(x, k)
  }
  visitar(dato)
  return medios
}

function leerTiktok(d) {
  const info = d.data || {}
  const medios = []
  for (const x of info.meta?.media || []) {
    const url = x.hd || x.org || x.wm
    if (/^https?:\/\//.test(url || '')) medios.push({ tipo: x.type === 'image' ? 'image' : 'video', url })
  }
  const titulo = /^no description/i.test(info.title || '') ? '' : String(info.title || '')
  return { titulo, autor: info.author?.nickname || info.author?.username || '', medios }
}

/** Baja los archivos de una publicación: prueba cada ruta de Delirius hasta que una devuelva algo. */
export async function descargarRed(red, enlace) {
  const cfg = REDES[red]
  let ultimo = 'sin resultado'
  for (const ruta of cfg.rutas) {
    try {
      const d = await delirius(ruta, { url: enlace }, { ms: 40000 })
      const r = red === 'tiktok' ? leerTiktok(d) : { titulo: String(d.data?.caption || d.data?.title || d.data?.text || d.caption || ''), autor: String(d.data?.username || d.data?.author?.username || d.data?.author || ''), medios: extraerMedios(d.data ?? d) }
      if (r.medios.length) return { ...r, titulo: r.titulo.slice(0, 200), autor: typeof r.autor === 'string' ? r.autor.slice(0, 60) : '' }
      ultimo = 'esa publicación no trae videos ni fotos'
    } catch (error) { ultimo = error.message }
  }
  throw new Error(`${cfg.nombre}: ${ultimo}`)
}

// ── Música: Spotify y SoundCloud ────────────────────────────────────────────────────
export const esEnlaceSpotify = t => /^https?:\/\/open\.spotify\.com\/(intl-[a-z]+\/)?track\//i.test(String(t || '').trim())
export const esEnlaceSoundcloud = t => /^https?:\/\/(www\.|m\.)?soundcloud\.com\/[^/\s]+\/[^/\s]+/i.test(String(t || '').trim())

export async function buscarSpotify(consulta, limite = 8) {
  const d = await delirius('/search/spotify', { q: consulta, limit: limite })
  return (Array.isArray(d.data) ? d.data : []).filter(x => x.url).slice(0, limite)
    .map(x => ({ titulo: x.title, artista: x.artist, album: x.album, duracion: x.duration, url: x.url, imagen: x.image }))
}
export async function spotifyDl(enlace) {
  const d = await delirius('/download/spotifydl', { url: enlace }, { ms: 60000 })
  if (!/^https?:\/\//.test(d.data?.download || '')) throw new Error('Spotify no me dio el audio')
  return { titulo: d.data.title || '', artista: d.data.author || '', imagen: d.data.image || '', url: d.data.download }
}

export async function buscarSoundcloud(consulta, limite = 8) {
  const d = await delirius('/search/soundcloud', { q: consulta, limit: limite })
  return (Array.isArray(d.data) ? d.data : []).filter(x => x.link).slice(0, limite)
    .map(x => ({ titulo: x.title, artista: x.artist && x.artist !== '-' ? x.artist : '', duracion: x.duration ? duracionTexto(x.duration / 1000) : '', url: x.link, imagen: x.image }))
}
export async function soundcloudDl(enlace) {
  const d = await delirius('/download/soundcloud', { url: enlace }, { ms: 60000 })
  const audio = typeof d.data === 'string' && /^https?:\/\//.test(d.data) ? d.data : extraerMedios(d.data ?? d).find(x => x.tipo !== 'image')?.url
  if (!audio) throw new Error('SoundCloud no dejó bajar esa canción')
  return { titulo: d.data?.title || '', artista: d.data?.author || '', imagen: d.data?.image || '', url: audio }
}

// ── Paquetes de stickers (Sticker.ly) ───────────────────────────────────────────────
export const esEnlaceStickerly = t => /^https?:\/\/sticker\.ly\/s\/[A-Za-z0-9]+/i.test(String(t || '').trim())
export async function buscarStickerly(consulta, limite = 10) {
  const d = await delirius('/search/stickerly', { query: consulta })
  return (Array.isArray(d.data) ? d.data : []).filter(x => x.url && !x.isPaid).slice(0, limite)
    .map(x => ({ nombre: String(x.name || '').trim(), autor: String(x.author || ''), cantidad: Number(x.sticker_count) || 0, animado: !!x.isAnimated, url: x.url, imagen: x.preview }))
}
export async function packStickerly(enlace) {
  const d = await delirius('/download/stickerly', { url: enlace }, { ms: 40000 })
  const info = d.data || {}
  const stickers = (Array.isArray(info.stickers) ? info.stickers : []).filter(u => /^https?:\/\//.test(u))
  if (!stickers.length) throw new Error('Ese paquete no trae stickers')
  return { nombre: String(info.name || 'Paquete').trim(), autor: String(info.author || info.username || ''), animado: !!info.isAnimated, imagen: info.preview || stickers[0], stickers }
}

// ── Letras y anime ──────────────────────────────────────────────────────────────────
export async function buscarLetra(consulta) {
  const d = (await delirius('/search/lyrics', { query: consulta }, { ms: 40000 })).data || {}
  const letra = String(d.lyrics || '').trim()
  if (!letra) throw new Error('No encontré la letra')
  return { titulo: String(d.title || consulta), artista: String(d.artists || ''), album: String(d.album || ''), duracion: String(d.duration || ''), letra }
}

const lista = v => (Array.isArray(v) ? v.filter(x => typeof x === 'string') : [])
export async function infoAnime(nombre) {
  const d = (await delirius('/anime/animeinfo', { query: nombre }, { ms: 45000 })).data || {}
  if (!d.title) throw new Error('No encontré ese anime')
  return {
    titulo: String(d.title), japones: String(d.japaneseTitle || ''), tipo: String(d.type || ''), estado: String(d.status || ''), episodios: String(d.episodes || ''),
    emision: String(d.aired || ''), duracion: String(d.duration || ''), puntaje: String(d.score || ''), ranking: String(d.ranked || ''), popularidad: String(d.popularity || ''),
    generos: lista(d.genres), estudios: lista(d.studios), sinopsis: String(d.synopsis || '').replace(/\s+/g, ' ').trim(), imagen: /^https?:\/\//.test(d.picture || '') ? d.picture : '', enlace: String(d.url || '')
  }
}

// ── Imágenes hechas por la API (brat, attp) ─────────────────────────────────────────
/** Pide una imagen/video generado: devuelve { buffer, tipo }. */
export async function lienzo(ruta, params = {}, maxBytes = 4 * 1024 * 1024) {
  const q = new URLSearchParams(params)
  const r = await fetch(`${BASE()}${ruta}?${q}`, { signal: AbortSignal.timeout(40000), headers: { 'User-Agent': 'YuiBot-MD/1.0' } })
  const tipo = r.headers.get('content-type') || ''
  if (!r.ok || !/^(image|video)\//.test(tipo)) throw new Error(`La API no devolvió una imagen (HTTP ${r.status})`)
  const buffer = Buffer.from(await r.arrayBuffer())
  if (!buffer.length || buffer.length > maxBytes) throw new Error('La imagen llegó vacía o muy pesada')
  return { buffer, tipo }
}
