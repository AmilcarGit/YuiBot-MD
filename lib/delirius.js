// Cliente de la API gratuita de Delirius (https://api.delirius.online, sin token).
// Cada función devuelve el MISMO formato que usaban antes los módulos de descarga,
// así lib/youtube.js, lib/tiktok.js y lib/instagram.js solo cambian de proveedor.
const fetch = require('./http').fetchSeguro // timeout por defecto (ver lib/http.js)

const BASE = 'https://api.delirius.online'

const INTENTOS = 3
const ESPERA_MS = 1500

const esperar = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

function describirErrorRed(error) {
  const causa = error?.cause?.code || error?.cause?.message || error?.message || 'error de red'
  return `No se pudo conectar con Delirius (${causa}). Revisa tu internet e inténtalo de nuevo.`
}

// Reintenta los fallos de red (timeouts de conexión, DNS, 5xx): en el celular
// la conexión a veces tarda más de los 10 s que Node espera para conectar.
async function pedir(ruta, params) {
  const url = `${BASE}${ruta}?${new URLSearchParams(params).toString()}`
  let json
  let ultimoError

  for (let intento = 1; intento <= INTENTOS; intento++) {
    try {
      const resp = await fetch(url)
      if (resp.status >= 500 && intento < INTENTOS) {
        ultimoError = new Error(`Delirius respondió HTTP ${resp.status}`)
        await esperar(ESPERA_MS * intento)
        continue
      }
      if (!resp.ok) throw Object.assign(new Error(`Delirius respondió HTTP ${resp.status}`), { sinReintento: true })
      json = await resp.json()
      break
    } catch (error) {
      if (error.sinReintento) throw error
      ultimoError = error?.cause || error?.name === 'TypeError' ? new Error(describirErrorRed(error)) : error
      if (intento < INTENTOS) await esperar(ESPERA_MS * intento)
    }
  }
  if (json === undefined) throw ultimoError || new Error('Delirius no respondió')

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

/**
 * Llama a CUALQUIER endpoint de Delirius y devuelve la respuesta cruda (para descubrir cómo responde antes de crear un comando).
 * La ruta es siempre relativa a la base: no se puede apuntar a otro servidor.
 */
async function explorar(ruta, params = {}, fetchFn = fetch) {
  if (!/^\/[\w\-./]{1,80}$/.test(String(ruta)) || String(ruta).includes('..') || String(ruta).includes('//')) throw new Error('Ruta no válida. Ejemplo: /search/lyrics')
  const url = `${BASE}${ruta}?${new URLSearchParams(params).toString()}`
  const t0 = Date.now()
  let resp
  try { resp = await fetchFn(url) } catch (e) { await esperar(ESPERA_MS); try { resp = await fetchFn(url) } catch (e2) { throw new Error(describirErrorRed(e2)) } }
  const texto = await resp.text()
  let json = null
  try { json = JSON.parse(texto) } catch { /* no es JSON */ }
  return { http: resp.status, ms: Date.now() - t0, json, texto, tipo: resp.headers?.get?.('content-type') || '' }
}

// ── Endpoints cuya ruta exacta no está documentada ──
// Delirius no publica su lista de rutas, así que para estos comandos se prueban
// varias rutas/parámetros probables y se recuerda la que responde con el formato esperado
// (en memoria y en data/delirius-rutas.json, que también se puede editar a mano:
//  { "robloxstalk": { "ruta": "/tools/robloxstalk", "param": "user" } }).
const path = require('path')
const { crearAlmacenCacheado } = require('./escrituraAtomica')
const almacenRutas = crearAlmacenCacheado(path.join(__dirname, '..', 'data', 'delirius-rutas.json'))

async function probarUna(ruta, params, validar, fetchFn) {
  const url = `${BASE}${ruta}?${new URLSearchParams(params).toString()}`
  try {
    const resp = await fetchFn(url)
    if (!resp.ok) return null
    const json = await resp.json()
    if (!json?.status) return { error: json?.message || json?.error || null }
    return validar(json) ? { json } : null
  } catch { return null }
}

/**
 * @param {string} clave  nombre con el que se recuerda la ruta ganadora
 * @param {{rutas:string[], params:string[]}} candidatos  `params` = nombres posibles del parámetro principal (null = sin parámetro)
 * @param {string|undefined} valor  valor del parámetro principal
 * @param {(json:object)=>boolean} validar  comprueba que la respuesta tiene el formato esperado
 * @param {object} [extra]  parámetros fijos (p. ej. page)
 */
async function buscarRuta(clave, candidatos, valor, validar, extra = {}, fetchFn = fetch) {
  const guardada = almacenRutas.leer()[clave]
  const lista = []
  if (guardada?.ruta) lista.push({ ruta: guardada.ruta, params: [guardada.param] })
  for (const ruta of candidatos.rutas) lista.push({ ruta, params: candidatos.params })

  let mensaje = null
  for (const { ruta, params } of lista) {
    const intentos = await Promise.all(params.map((p) => probarUna(ruta, { ...(p && valor !== undefined ? { [p]: valor } : {}), ...extra }, validar, fetchFn).then((r) => ({ r, p }))))
    for (const { r, p } of intentos) if (r?.error) mensaje = r.error
    const ok = intentos.find((i) => i.r?.json)
    if (ok) {
      if (guardada?.ruta !== ruta || guardada?.param !== ok.p) {
        const d = almacenRutas.leer(); d[clave] = { ruta, param: ok.p }; almacenRutas.guardar(d)
      }
      return ok.r.json
    }
  }
  throw new Error(mensaje || 'Delirius no respondió con el formato esperado (la ruta puede haber cambiado). Prueba con .delirius')
}

const texto = (v) => (v === undefined || v === null || v === '' || v === '-' ? '' : String(v))

async function robloxPerfil(usuario, fetchFn) {
  const json = await buscarRuta('robloxstalk',
    { rutas: ['/tools/robloxstalk', '/stalk/roblox', '/tools/roblox', '/tools/rbxstalk', '/search/roblox'], params: ['user', 'username', 'q', 'query'] },
    usuario, (j) => j?.data?.username && j.data.id, {}, fetchFn)
  const d = json.data
  return {
    id: d.id, usuario: d.username, nombre: d.name, descripcion: texto(d.description), baneado: Boolean(d.isBanned), verificado: Boolean(d.hasVerified),
    seguidores: d.followers, siguiendo: d.followings, amigos: d.friends, creada: texto(d.created), ultimaVez: texto(d.presence), url: d.url, foto: d.profile_image,
    estado: d.extraInfo?.accountStatus, juegos: (Array.isArray(d.gamesCreated) ? d.gamesCreated : []).map((g) => ({ nombre: g.name, jugando: g.playing, id: g.gameId })),
  }
}

async function tiktokPerfil(usuario, fetchFn) {
  const json = await buscarRuta('tiktokstalk',
    { rutas: ['/tools/tiktokstalk', '/stalk/tiktok', '/tools/ttstalk', '/tools/tiktokuser', '/search/tiktokuser'], params: ['user', 'username', 'q', 'query'] },
    usuario.replace(/^@/, ''), (j) => j?.result?.users?.username || j?.data?.users?.username, {}, fetchFn)
  const r = json.result || json.data
  const u = r.users; const e = r.stats || {}
  return {
    usuario: u.username, nombre: u.nickname, bio: texto(u.signature), verificado: Boolean(u.verified), privada: Boolean(u.privateAccount), url: u.url,
    foto: u.avatarLarger || u.avatarMedium || u.avatarThumb,
    seguidores: e.followerCount, siguiendo: e.followingCount, likes: e.heartCount, videos: e.videoCount, amigos: e.friendCount,
  }
}

async function instagramPerfil(usuario, fetchFn) {
  const json = await buscarRuta('igstalk',
    { rutas: ['/tools/igstalk', '/stalk/instagram', '/tools/instagramstalk', '/tools/instagram', '/search/instagramuser'], params: ['username', 'user', 'q', 'query'] },
    usuario.replace(/^@/, ''), (j) => j?.data && typeof j.data === 'object' && 'followers' in j.data && 'biography' in j.data, {}, fetchFn)
  const d = json.data
  return {
    usuario: texto(d.username), nombre: texto(d.full_name), bio: texto(d.biography), categoria: texto(d.category), url: texto(d.url), web: texto(d.external_url), pronombres: texto(d.pronouns),
    privada: Boolean(d.private), verificado: Boolean(d.verified), negocio: Boolean(d.business), creador: Boolean(d.creator_account),
    publicaciones: d.posts, seguidores: d.followers, siguiendo: d.following,
  }
}

async function minecraftNoticias(pagina = 1, fetchFn) {
  const json = await buscarRuta('minecraftnews',
    { rutas: ['/search/minecraftnews', '/news/minecraft', '/search/minecraftnoticias', '/tools/minecraftnews', '/search/minecraft'], params: [null] },
    undefined, (j) => Array.isArray(j?.data) && j.data.length && j.data[0]?.title && j.data[0]?.url, { page: pagina }, fetchFn)
  const limpiar = (t) => String(t ?? '').replace(/&#39;/g, "'").replace(/&#34;|&quot;/g, '"').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').trim()
  return {
    total: json.total, pagina: json.page || pagina,
    noticias: json.data.map((n) => ({ titulo: limpiar(n.title), resumen: limpiar(n.description), autor: limpiar(n.author), tipo: n.type, fecha: n.published, url: n.url, imagen: n.image })),
  }
}

async function buscarAnimeMAL(consulta, fetchFn) {
  const json = await buscarRuta('anime-mal',
    { rutas: ['/search/myanimelist', '/search/mal', '/anime/search', '/search/anime', '/search/animemal', '/search/anime/mal'], params: ['q', 'query', 'text', 'name'] },
    consulta, (j) => Array.isArray(j?.data) && j.data.length && j.data[0]?.name && j.data[0]?.payload, {}, fetchFn)
  return json.data.map((a) => ({
    id: a.id, tipo: a.type, nombre: a.name, url: a.url, imagen: a.image_url || a.thumbnail_url,
    formato: a.payload?.media_type, anio: a.payload?.start_year, emision: a.payload?.aired, puntuacion: a.payload?.score, estado: a.payload?.status,
  }))
}

module.exports = {
  robloxPerfil, tiktokPerfil, instagramPerfil, minecraftNoticias, buscarAnimeMAL,
  explorar,
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
  _internos: { buscarRuta, almacenRutas, pedir, describirErrorRed, adaptarBusqueda, adaptarYoutube, adaptarTikTok, adaptarMedios },
}
