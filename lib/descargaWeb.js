// Descargas de redes sociales, archivos y páginas web (usadas por .dl, .twitter, .mediafire, .gitclone…).
// Cada función devuelve un resultado uniforme que `enviarResultado` sabe mandar:
//   { kind: 'medios',  sitio, titulo, autor, medios: [{ tipo: 'video'|'imagen'|'audio', buffer, nombre }] }
//   { kind: 'archivo', sitio, nombre, buffer, mime, detalle: [[etiqueta, valor, icono]] }
const { fetchSeguro } = require('./http')
const { ytDlpDisponible, descargarLocal } = require('./youtube')
const { caja } = require('./estilo')
const defaults = require('../defaults')

const UA = 'Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Mobile Safari/537.36'
const LIMITE_VIDEO_MB = 64 // más pesado se manda como documento

const maxMB = () => Number(defaults.DESCARGAS?.MAX_MB) || 100

// ── Sitios reconocidos ────────────────────────────────────────────────
const SITIOS = [
  { clave: 'twitter', nombre: 'X / Twitter', emoji: '🐦', re: /(?:^|\.)(?:twitter|x|fixupx|fxtwitter|vxtwitter)\.com\/[^/]+\/status\/\d+/i },
  { clave: 'threads', nombre: 'Threads', emoji: '🧵', re: /(?:^|\.)threads\.(?:net|com)\/@[^/]+\/post\//i },
  { clave: 'reddit', nombre: 'Reddit', emoji: '👽', re: /(?:^|\.)(?:reddit\.com\/r\/[^/]+\/(?:comments|s)\/|redd\.it\/)/i },
  { clave: 'pinterest', nombre: 'Pinterest', emoji: '📌', re: /(?:^|\.)(?:pinterest\.[a-z.]+\/pin\/|pin\.it\/)/i },
  { clave: 'likee', nombre: 'Likee', emoji: '💃', re: /(?:^|\.)(?:likee\.video|l\.likee\.video)\//i },
  { clave: 'tiktok', nombre: 'TikTok', emoji: '🎵', re: /(?:^|\.)(?:tiktok\.com|vm\.tiktok\.com|vt\.tiktok\.com)\//i, comando: 'tiktok' },
  { clave: 'instagram', nombre: 'Instagram', emoji: '📸', re: /(?:^|\.)instagram\.com\/(?:p|reel|reels|tv)\//i, comando: 'instagram' },
  { clave: 'facebook', nombre: 'Facebook', emoji: '📘', re: /(?:^|\.)(?:facebook\.com|fb\.watch)\//i, comando: 'facebook' },
  { clave: 'youtube', nombre: 'YouTube', emoji: '▶️', re: /(?:^|\.)(?:youtube\.com\/(?:watch|shorts)|youtu\.be\/)/i, comando: 'youtube', comandoAudio: 'ytmp3' },
  { clave: 'spotify', nombre: 'Spotify', emoji: '🎧', re: /(?:^|\.)open\.spotify\.com\/track\//i, comando: 'spotify', soloComando: true },
  { clave: 'soundcloud', nombre: 'SoundCloud', emoji: '☁️', re: /(?:^|\.)soundcloud\.com\/[^/]+\/[^/]+/i, comando: 'soundcloud', soloComando: true },
  { clave: 'mediafire', nombre: 'MediaFire', emoji: '🔥', re: /(?:^|\.)mediafire\.com\/(?:file|view|download|\?)/i },
  { clave: 'gdrive', nombre: 'Google Drive', emoji: '📁', re: /(?:^|\.)drive\.google\.com\/(?:file\/d\/|open\?id=|uc\?)/i },
  { clave: 'mega', nombre: 'MEGA', emoji: '🅼', re: /(?:^|\.)mega\.nz\/(?:file\/|#!)/i },
  { clave: 'github', nombre: 'GitHub', emoji: '🐙', re: /(?:^|\.)github\.com\/[^/\s]+\/[^/\s?#]+/i },
]

const extraerUrl = (texto) => (String(texto || '').match(/https?:\/\/[^\s<>"']+/i) || [])[0]?.replace(/[)\].,;]+$/, '') || null

function detectarSitio(url) {
  const limpio = String(url || '').replace(/^https?:\/\//i, '')
  return SITIOS.find((s) => s.re.test(limpio)) || null
}

/** Rechaza direcciones locales/privadas (evita que se use el bot para mirar la red interna). */
function urlSegura(texto) {
  let u
  try { u = new URL(/^https?:\/\//i.test(texto) ? texto : `https://${texto}`) } catch { return null }
  if (!/^https?:$/.test(u.protocol)) return null
  const h = u.hostname.toLowerCase()
  if (!h.includes('.') || h === 'localhost' || h.endsWith('.local') || h.endsWith('.internal')) return null
  if (/^(127\.|10\.|0\.|169\.254\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(h) || h.startsWith('[')) return null
  return u.toString()
}

// ── Utilidades de red ─────────────────────────────────────────────────
async function pedir(url, { headers = {}, json = false, texto = false } = {}) {
  const resp = await fetchSeguro(url, { headers: { 'User-Agent': UA, ...headers }, redirect: 'follow' })
  if (!resp.ok) { const e = new Error(`HTTP ${resp.status}`); e.status = resp.status; throw e }
  return json ? resp.json() : texto ? resp.text() : resp
}

/** Descarga a memoria respetando el límite de peso (por cabecera y por tamaño real). */
async function bajarBuffer(url, { headers = {}, limiteMB = maxMB(), nombre = 'archivo' } = {}) {
  const resp = await pedir(url, { headers })
  const declarado = Number(resp.headers?.get?.('content-length')) || 0
  if (declarado > limiteMB * 1048576) throw new Error(`${nombre} pesa ${(declarado / 1048576).toFixed(0)} MB y el límite es ${limiteMB} MB`)
  const buffer = Buffer.from(await resp.arrayBuffer())
  if (!buffer.length) throw new Error('El archivo vino vacío')
  if (buffer.length > limiteMB * 1048576) throw new Error(`${nombre} pesa ${(buffer.length / 1048576).toFixed(0)} MB y el límite es ${limiteMB} MB`)
  return { buffer, resp }
}

const decodificarEntidades = (t) => String(t)
  .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#0?39;|&apos;/g, "'").replace(/&nbsp;/g, ' ')
  .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n) || 32))
  .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16) || 32))

/** Etiquetas Open Graph de una página (título, imagen, video). */
function metaPagina(html) {
  const leer = (...props) => {
    for (const p of props) {
      const m = html.match(new RegExp(`<meta[^>]+(?:property|name)=["']${p}["'][^>]*content=["']([^"']*)["']`, 'i'))
        || html.match(new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]*(?:property|name)=["']${p}["']`, 'i'))
      if (m) return decodificarEntidades(m[1])
    }
    return ''
  }
  return {
    titulo: leer('og:title', 'twitter:title') || decodificarEntidades((html.match(/<title[^>]*>([^<]*)/i) || [])[1] || ''),
    descripcion: leer('og:description', 'description'),
    imagen: leer('og:image', 'twitter:image'),
    video: leer('og:video:secure_url', 'og:video', 'og:video:url', 'twitter:player:stream'),
  }
}

const nombreDeUrl = (url, defecto) => {
  try { return decodeURIComponent(new URL(url).pathname.split('/').filter(Boolean).pop() || defecto).slice(0, 100) } catch { return defecto }
}
const mimeDe = (nombre) => ({
  zip: 'application/zip', tgz: 'application/gzip', gz: 'application/gzip', apk: 'application/vnd.android.package-archive', pdf: 'application/pdf',
  mp4: 'video/mp4', mp3: 'audio/mpeg', jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', txt: 'text/plain', rar: 'application/vnd.rar', '7z': 'application/x-7z-compressed',
}[String(nombre).split('.').pop().toLowerCase()] || 'application/octet-stream')

const MB = (b) => `${(b / 1048576).toFixed(1)} MB`

// ── Redes sociales ────────────────────────────────────────────────────
async function medioDesdeUrl(tipo, url, nombre) {
  const { buffer } = await bajarBuffer(url, { nombre })
  return { tipo, buffer, nombre }
}

/** X / Twitter vía fxtwitter (fotos, videos y GIFs); yt-dlp de respaldo. */
async function twitter(url) {
  const m = String(url).match(/(?:twitter|x|fixupx|fxtwitter|vxtwitter)\.com\/([^/]+)\/status\/(\d+)/i)
  if (!m) throw new Error('Enlace de X/Twitter no válido')
  try {
    const data = await pedir(`https://api.fxtwitter.com/${m[1]}/status/${m[2]}`, { json: true })
    const t = data.tweet
    const todos = t?.media?.all || []
    if (!todos.length) throw new Error('Ese tweet no tiene fotos ni videos')
    const medios = []
    for (const [i, md] of todos.slice(0, 4).entries()) {
      const video = md.type === 'video' || md.type === 'gif'
      medios.push(await medioDesdeUrl(video ? 'video' : 'imagen', md.url, `x-${m[2]}-${i + 1}.${video ? 'mp4' : 'jpg'}`))
    }
    return { kind: 'medios', sitio: 'twitter', titulo: t.text || '', autor: t.author?.screen_name || m[1], medios }
  } catch (error) {
    if (!(await ytDlpDisponible())) throw error
    return porYtDlp('twitter', url)
  }
}

/** Cualquier sitio que yt-dlp entienda. */
async function porYtDlp(sitio, url, tipo = 'video') {
  const r = await descargarLocal(url, tipo)
  const ext = tipo === 'audio' ? 'mp3' : 'mp4'
  return { kind: 'medios', sitio, titulo: r.info.description || r.titulo, autor: r.info.uploader_id || r.info.uploader || r.canal, medios: [{ tipo, buffer: r.buffer, nombre: `${sitio}.${ext}` }] }
}

/** Respaldo sin yt-dlp: lee el video/imagen que la propia página declara (Open Graph). */
async function porMeta(sitio, url) {
  const html = await pedir(url, { texto: true })
  const meta = metaPagina(html)
  const medios = []
  if (meta.video) medios.push(await medioDesdeUrl('video', meta.video, `${sitio}.mp4`))
  else if (meta.imagen) medios.push(await medioDesdeUrl('imagen', meta.imagen.replace(/\/\d+x\//, '/originals/'), `${sitio}.jpg`))
  if (!medios.length) throw new Error('No encontré ningún video ni imagen en ese enlace')
  return { kind: 'medios', sitio, titulo: meta.titulo || meta.descripcion, autor: '', medios }
}

async function reddit(url) {
  if (await ytDlpDisponible()) {
    try { return await porYtDlp('reddit', url) } catch (error) { console.log('[REDDIT] yt-dlp falló:', error.message) }
  }
  try {
    const limpio = url.split('?')[0].replace(/\/$/, '')
    const data = await pedir(`${limpio}.json?raw_json=1`, { json: true })
    const post = data?.[0]?.data?.children?.[0]?.data
    if (!post) throw new Error('sin datos')
    const medios = []
    if (post.is_video && post.media?.reddit_video?.fallback_url) medios.push(await medioDesdeUrl('video', post.media.reddit_video.fallback_url.split('?')[0], 'reddit.mp4'))
    else if (post.gallery_data?.items) {
      for (const it of post.gallery_data.items.slice(0, 4)) {
        const u = post.media_metadata?.[it.media_id]?.s?.u
        if (u) medios.push(await medioDesdeUrl('imagen', u, `reddit-${medios.length + 1}.jpg`))
      }
    } else if (/\.(jpe?g|png|gif)$/i.test(post.url_overridden_by_dest || '')) medios.push(await medioDesdeUrl('imagen', post.url_overridden_by_dest, 'reddit.jpg'))
    if (!medios.length) throw new Error('El post no tiene imagen ni video')
    return { kind: 'medios', sitio: 'reddit', titulo: post.title, autor: post.author, medios }
  } catch (error) {
    return porMeta('reddit', url)
  }
}

async function conRespaldoMeta(sitio, url) {
  if (await ytDlpDisponible()) {
    try { return await porYtDlp(sitio, url) } catch (error) { console.log(`[${sitio.toUpperCase()}] yt-dlp falló:`, error.message) }
  }
  return porMeta(sitio, url)
}

// ── Archivos ──────────────────────────────────────────────────────────
async function mediafire(url) {
  const html = await pedir(url, { texto: true })
  let directo = (html.match(/href=["'](https?:\/\/download[^"']+)["']/i) || [])[1]
  if (!directo) {
    const cifrado = (html.match(/data-scrambled-url=["']([^"']+)["']/i) || [])[1]
    if (cifrado) { try { directo = Buffer.from(cifrado, 'base64').toString('utf8') } catch { /* sin enlace */ } }
  }
  if (!directo || !/^https?:\/\//.test(directo)) throw new Error('No encontré el botón de descarga (el archivo fue borrado o es privado)')
  const nombre = decodificarEntidades((html.match(/<div class="filename">\s*([^<]+?)\s*</i) || [])[1] || nombreDeUrl(directo, 'mediafire'))
  const { buffer } = await bajarBuffer(directo, { nombre })
  return { kind: 'archivo', sitio: 'mediafire', nombre, buffer, mime: mimeDe(nombre), detalle: [['Origen', 'MediaFire', '🔥']] }
}

async function gdrive(url) {
  const id = (String(url).match(/\/file\/d\/([\w-]{10,})/) || String(url).match(/[?&]id=([\w-]{10,})/) || [])[1]
  if (!id) throw new Error('No pude leer el ID del archivo (las carpetas no se pueden descargar)')
  const { buffer, resp } = await bajarBuffer(`https://drive.usercontent.google.com/download?id=${id}&export=download&confirm=t`, { nombre: 'El archivo' })
  const tipo = String(resp.headers?.get?.('content-type') || '')
  if (tipo.includes('text/html')) throw new Error('El archivo es privado o Google bloqueó la descarga. Debe estar compartido como "cualquiera con el enlace"')
  const cd = String(resp.headers?.get?.('content-disposition') || '')
  const nombre = decodeURIComponent((cd.match(/filename\*=UTF-8''([^;]+)/i) || cd.match(/filename="?([^";]+)"?/i) || [])[1] || `drive-${id}`)
  return { kind: 'archivo', sitio: 'gdrive', nombre, buffer, mime: tipo || mimeDe(nombre), detalle: [['Origen', 'Google Drive', '📁']] }
}

async function mega(url) {
  let File
  try { ({ File } = require('megajs')) } catch { throw new Error('Falta instalar el módulo de MEGA: en Termux ejecuta `npm i megajs` y reinicia el bot') }
  const archivo = File.fromURL(url)
  await archivo.loadAttributes()
  if (archivo.directory) throw new Error('Ese enlace es una carpeta; envía el enlace de un archivo')
  if (archivo.size > maxMB() * 1048576) throw new Error(`${archivo.name} pesa ${MB(archivo.size)} y el límite es ${maxMB()} MB`)
  const buffer = await archivo.downloadBuffer()
  return { kind: 'archivo', sitio: 'mega', nombre: archivo.name, buffer, mime: mimeDe(archivo.name), detalle: [['Origen', 'MEGA', '🅼']] }
}

/** Repositorio de GitHub como ZIP (acepta "dueño/repo", enlaces y /tree/<rama>). */
async function github(entrada) {
  const m = String(entrada).trim().replace(/^https?:\/\/(?:www\.)?github\.com\//i, '').replace(/\.git$/i, '').match(/^([\w.-]+)\/([\w.-]+)(?:\/tree\/([^/?#]+))?/)
  if (!m) throw new Error('Escribe el repositorio como dueño/repo o pega su enlace de GitHub')
  const [, dueno, repo, ramaPedida] = m
  let info
  try { info = await pedir(`https://api.github.com/repos/${dueno}/${repo}`, { json: true, headers: { Accept: 'application/vnd.github+json' } }) } catch (error) {
    if (error.status === 404) throw new Error('Ese repositorio no existe o es privado')
    if (error.status === 403) throw new Error('GitHub limitó las consultas por ahora; intenta en unos minutos')
    throw error
  }
  const rama = ramaPedida || info.default_branch || 'main'
  if (info.size && info.size * 1024 > maxMB() * 1048576) throw new Error(`El repositorio pesa unos ${MB(info.size * 1024)} y el límite es ${maxMB()} MB`)
  const { buffer } = await bajarBuffer(`https://codeload.github.com/${dueno}/${repo}/zip/refs/heads/${encodeURIComponent(rama)}`, { nombre: 'El repositorio' })
  return {
    kind: 'archivo', sitio: 'github', nombre: `${repo}-${rama}.zip`, buffer, mime: 'application/zip',
    detalle: [['Repo', `${dueno}/${repo}`, '🐙'], ['Rama', rama, '🌿'], ['Estrellas', String(info.stargazers_count ?? 0), '⭐'], ['Descripción', String(info.description || 'Sin descripción').slice(0, 90), '📝']],
  }
}

/** Paquete de npm (.tgz). Acepta nombre, nombre@versión y @alcance/nombre. */
async function npm(entrada) {
  const m = String(entrada).trim().match(/^(@[\w.-]+\/[\w.-]+|[\w.-]+)(?:@([\w.^~<>=*-]+))?$/)
  if (!m) throw new Error('Nombre de paquete no válido. Ejemplo: lodash o lodash@4.17.21')
  const [, nombre, version = 'latest'] = m
  let info
  try { info = await pedir(`https://registry.npmjs.org/${encodeURIComponent(nombre).replace('%40', '@')}/${version}`, { json: true }) } catch (error) {
    if (error.status === 404) throw new Error('No encontré ese paquete o esa versión en npm')
    throw error
  }
  if (!info.dist?.tarball) throw new Error('npm no devolvió el archivo del paquete')
  const { buffer } = await bajarBuffer(info.dist.tarball, { nombre: 'El paquete' })
  return {
    kind: 'archivo', sitio: 'npm', nombre: `${nombre.replace(/^@/, '').replace('/', '-')}-${info.version}.tgz`, buffer, mime: 'application/gzip',
    detalle: [['Paquete', `${info.name}@${info.version}`, '📦'], ['Licencia', String(info.license || 'N/D'), '⚖️'], ['Descripción', String(info.description || 'Sin descripción').slice(0, 90), '📝']],
  }
}

// ── Páginas web ───────────────────────────────────────────────────────
/** Texto legible de un artículo (quita menús, scripts y anuncios). */
function extraerTexto(html) {
  let h = String(html).replace(/<!--[\s\S]*?-->/g, ' ').replace(/<(script|style|noscript|svg|nav|header|footer|aside|form|iframe|button)[\s\S]*?<\/\1>/gi, ' ')
  const bloque = (h.match(/<article[\s\S]*?<\/article>/i) || h.match(/<main[\s\S]*?<\/main>/i) || h.match(/<body[\s\S]*?<\/body>/i) || [h])[0]
  const texto = decodificarEntidades(
    bloque.replace(/<\/(p|div|h[1-6]|li|tr|blockquote|section)>|<br\s*\/?>/gi, '\n').replace(/<li[^>]*>/gi, '• ').replace(/<[^>]+>/g, ' ')
  )
  return texto.split('\n').map((l) => l.replace(/[ \t ]+/g, ' ').trim()).filter((l) => l.length > 1).join('\n').replace(/\n{3,}/g, '\n\n')
}

async function webtext(url) {
  const html = await pedir(url, { texto: true })
  const texto = extraerTexto(html)
  if (texto.length < 40) throw new Error('No encontré texto legible (la página puede cargarse con JavaScript)')
  return { titulo: metaPagina(html).titulo || url, texto }
}

/** Copia archivada en Wayback Machine (la más cercana a `fecha` AAAA[MM[DD]]), o guarda una nueva. */
async function wayback(url, { fecha = '', guardar = false } = {}) {
  if (guardar) {
    const resp = await fetchSeguro(`https://web.archive.org/save/${url}`, { headers: { 'User-Agent': UA } })
    if (!resp.ok) throw new Error(`Archive.org respondió HTTP ${resp.status}`)
    const loc = resp.headers?.get?.('content-location')
    return { guardada: true, url: loc ? `https://web.archive.org${loc}` : `https://web.archive.org/web/2/${url}` }
  }
  const ts = String(fecha).replace(/\D/g, '').slice(0, 14)
  const data = await pedir(`https://archive.org/wayback/available?url=${encodeURIComponent(url)}${ts ? `&timestamp=${ts}` : ''}`, { json: true })
  const s = data?.archived_snapshots?.closest
  if (!s?.available) return null
  const t = String(s.timestamp)
  return { guardada: false, url: s.url.replace(/^http:/, 'https:'), fecha: `${t.slice(6, 8)}/${t.slice(4, 6)}/${t.slice(0, 4)}` }
}

// ── Punto de entrada y envío ──────────────────────────────────────────
const MANEJADORES = {
  twitter, mediafire, gdrive, mega, github, reddit,
  threads: (u) => conRespaldoMeta('threads', u),
  pinterest: (u) => conRespaldoMeta('pinterest', u),
  likee: (u) => conRespaldoMeta('likee', u),
}

/** Descarga un enlace de un sitio manejado aquí. `tipo` 'audio' solo aplica a redes con video. */
async function descargar(sitio, url, tipo = 'video') {
  if (tipo === 'audio' && ['twitter', 'threads', 'reddit', 'pinterest', 'likee'].includes(sitio)) {
    if (!(await ytDlpDisponible())) throw new Error('Para bajar solo el audio necesito yt-dlp (en Termux: `pkg install yt-dlp ffmpeg`)')
    return porYtDlp(sitio, url, 'audio')
  }
  const fn = MANEJADORES[sitio]
  if (!fn) throw new Error('Ese sitio no está soportado aquí')
  return fn(url)
}

const recorte = (t, n) => { const s = String(t || '').replace(/\s+/g, ' ').trim(); return s.length > n ? `${s.slice(0, n - 1)}…` : s }

async function enviarResultado(sock, msg, jid, res, { sitioInfo } = {}) {
  const q = { quoted: msg }
  if (res.kind === 'archivo') {
    const caption = caja(sitioInfo?.emoji || '📥', sitioInfo?.nombre || 'Descarga', [...res.detalle, ['Tamaño', MB(res.buffer.length), '💾']], '📥 Descargado con YuiBot-MD')
    return sock.sendMessage(jid, { document: res.buffer, mimetype: res.mime, fileName: res.nombre, caption }, q)
  }
  for (const [i, m] of res.medios.entries()) {
    const caption = i === 0 ? caja(sitioInfo?.emoji || '📥', sitioInfo?.nombre || 'Descarga', [
      res.titulo ? ['Texto', recorte(res.titulo, 150), '📝'] : null,
      res.autor ? ['Usuario', `@${res.autor}`, '👤'] : null,
      ['Tamaño', MB(m.buffer.length), '💾'],
    ].filter(Boolean), '📥 Descargado con YuiBot-MD') : ''
    if (m.tipo === 'imagen') await sock.sendMessage(jid, { image: m.buffer, caption }, q)
    else if (m.tipo === 'audio') await sock.sendMessage(jid, { audio: m.buffer, mimetype: 'audio/mpeg', fileName: m.nombre }, q)
    else if (m.buffer.length / 1048576 <= LIMITE_VIDEO_MB) await sock.sendMessage(jid, { video: m.buffer, mimetype: 'video/mp4', fileName: m.nombre, caption }, q)
    else await sock.sendMessage(jid, { document: m.buffer, mimetype: 'video/mp4', fileName: m.nombre, caption }, q)
  }
}

module.exports = {
  SITIOS, detectarSitio, extraerUrl, urlSegura, descargar, enviarResultado,
  twitter, reddit, mediafire, gdrive, mega, github, npm, webtext, wayback,
  _internos: { metaPagina, extraerTexto, decodificarEntidades, mimeDe, bajarBuffer },
}
