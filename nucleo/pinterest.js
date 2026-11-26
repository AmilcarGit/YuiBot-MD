// Código Oficial de YuiBot-MD.by AmilcarGit
// Adaptado de pinterest.mjs de AxelDev09: búsqueda de imágenes, detalles de un pin y videos.
// Sin axios ni cheerio: usa fetch y expresiones regulares, así funciona igual en el bot y en la web.
const UA_MOVIL = 'Mozilla/5.0 (Linux; Android 10; SM-G975F) AppleWebKit/537.36 Chrome/120.0.0.0 Mobile Safari/537.36'
const UA_PC = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36'

async function traer(url, { ua = UA_MOVIL, ms = 12000, cabeceras = {} } = {}) {
  const r = await fetch(url, { headers: { 'User-Agent': ua, 'Accept-Language': 'en-US,en;q=0.9', ...cabeceras }, redirect: 'follow', signal: AbortSignal.timeout(ms) })
  if (!r.ok) throw new Error(`Pinterest respondió ${r.status}`)
  return { texto: await r.text(), url: r.url || url }
}
const resolver = async entrada => (entrada.includes('pin.it/') ? (await traer(entrada, { ms: 10000 })).url : entrada)

export const esEnlacePin = t => /pinterest\.[a-z.]+\/pin\/|pin\.it\//i.test(t || '')

const limpiarUrl = s => String(s || '').trim().replace(/&amp;/g, '&')
function puntaje(src) {
  const v = limpiarUrl(src)
  if (v.includes('/originals/')) return 10000
  const cuadrada = v.match(/\/(\d+)x(\d+)\//); if (cuadrada) return Math.max(Number(cuadrada[1]) || 0, Number(cuadrada[2]) || 0)
  const ancho = v.match(/\/(\d+)x\//); return ancho ? Number(ancho[1]) || 0 : 0
}
const esPinValido = s => s.includes('i.pinimg.com') && /\.(jpg|jpeg|png|webp)/.test(s) && !s.includes('/60x60/') && !s.includes('/videos/thumbnails/')
const mejor = fuentes => fuentes.map(limpiarUrl).filter(esPinValido).sort((a, b) => puntaje(b) - puntaje(a))[0] || ''
// Se mantiene un tamaño público (736x) en vez de forzar /originals/.
const preferida = src => limpiarUrl(src).replace(/\/\d+x\d+\//, '/736x/').replace(/\/\d+x\//, '/736x/')

const atributo = (etiqueta, nombre) => etiqueta.match(new RegExp(`\\b${nombre}\\s*=\\s*("([^"]*)"|'([^']*)')`, 'i'))?.slice(2).find(x => x !== undefined) || ''

export function extraerVideos(html, limite) {
  const vistos = new Set(); const videos = []
  for (const m of html.matchAll(/https:\/\/v\d+\.pinimg\.com\/videos\/[^\s"'\\]+\.mp4/g)) {
    const original = m[0]; if (vistos.has(original)) continue
    vistos.add(original)
    videos.push({ video: original.replace(/\/\d+p\//, '/720p/'), sd: original.replace(/\/\d+p\//, '/480p/'), original })
    if (videos.length >= limite) break
  }
  return videos
}

export async function pinvid(entrada, limite = 5) {
  const url = esEnlacePin(entrada) ? await resolver(entrada) : `https://www.pinterest.com/search/pins/?q=${encodeURIComponent(entrada + ' video')}`
  const videos = extraerVideos((await traer(url)).texto, limite)
  if (!videos.length) throw new Error(esEnlacePin(entrada) ? 'Este pin no tiene video' : 'Sin videos en Pinterest')
  return videos.map((v, i) => ({ index: i + 1, ...v }))
}

export function extraerDeHtml(html) {
  const pinIds = []; const vistosId = new Set()
  for (const m of html.matchAll(/href\s*=\s*["'][^"']*\/pin\/(\d+)/gi)) if (!vistosId.has(m[1])) { vistosId.add(m[1]); pinIds.push(m[1]) }
  if (!pinIds.length) for (const m of html.matchAll(/"id"\s*:\s*"(\d{15,})"/g)) if (!vistosId.has(m[1])) { vistosId.add(m[1]); pinIds.push(m[1]) }
  const imgList = []; const vistas = new Set()
  const agregar = src => { const p = preferida(src); if (!vistas.has(p)) { vistas.add(p); imgList.push(p) } }
  for (const etiqueta of html.match(/<img\b[^>]*>/gi) || []) {
    const srcset = atributo(etiqueta, 'srcset').split(',').map(x => x.trim().split(/\s+/)[0]).filter(Boolean)
    const elegida = mejor([atributo(etiqueta, 'src'), ...srcset]); if (elegida) agregar(elegida)
  }
  for (const m of html.matchAll(/style\s*=\s*"[^"]*url\(['"]?(https:\/\/i\.pinimg\.com[^'")\s]+)/gi)) if (esPinValido(m[1])) agregar(m[1])
  return { pinIds, imgList }
}

const cacheBusquedas = new Map()
export async function pinsearch(consulta, limite = 50) {
  const clave = `busqueda:${consulta}`
  let c = cacheBusquedas.get(clave)
  if (!c) { c = { items: [], pagina: 0, marcador: null, fin: false }; cacheBusquedas.set(clave, c); setTimeout(() => cacheBusquedas.delete(clave), 30 * 60 * 1000).unref?.() }
  const vistos = new Set(c.items.map(i => i.pinId).filter(Boolean))
  let ultimoError = null
  while (c.items.length < limite && !c.fin) {
    try {
      if (c.pagina === 0) {
        const { texto } = await traer(`https://www.pinterest.com/search/pins/?q=${encodeURIComponent(consulta)}`, { ms: 15000 })
        c.marcador = texto.match(/"bookmark"\s*:\s*"([^"]+)"/)?.[1] || null
        const { pinIds, imgList } = extraerDeHtml(texto)
        for (let i = 0; i < imgList.length; i++) {
          const pid = pinIds[i]; if (pid && vistos.has(pid)) continue; if (pid) vistos.add(pid)
          c.items.push({ index: c.items.length + 1, image: imgList[i], url: pid ? `https://www.pinterest.com/pin/${pid}/` : imgList[i], pinId: pid || null })
        }
        c.pagina++
      } else if (c.marcador) {
        const datos = JSON.stringify({ options: { query: consulta, scope: 'pins', bookmarks: [c.marcador], page_size: 25 }, context: {} })
        const api = `https://www.pinterest.com/resource/SearchResource/get/?source_url=${encodeURIComponent(`/search/pins/?q=${encodeURIComponent(consulta)}`)}&data=${encodeURIComponent(datos)}&_=${Date.now()}`
        const { texto } = await traer(api, { ua: UA_PC, ms: 15000, cabeceras: { 'X-Requested-With': 'XMLHttpRequest', Accept: 'application/json', Referer: `https://www.pinterest.com/search/pins/?q=${encodeURIComponent(consulta)}` } })
        const r = JSON.parse(texto)?.resource_response
        c.marcador = r?.bookmark || null; if (!c.marcador) c.fin = true
        for (const p of r?.data || []) {
          if (!p.id || vistos.has(p.id)) continue; vistos.add(p.id)
          const img = p.images?.['736x']?.url || p.images?.['474x']?.url || p.images?.orig?.url
          if (img) c.items.push({ index: c.items.length + 1, image: preferida(img), url: `https://www.pinterest.com/pin/${p.id}/`, pinId: p.id })
        }
        c.pagina++
      } else { c.fin = true }
    } catch (error) { ultimoError = error; c.fin = true }
  }
  if (!c.items.length) { cacheBusquedas.delete(clave); throw new Error(ultimoError ? `Pinterest: ${ultimoError.message}` : 'Sin resultados en Pinterest') }
  return c.items.slice(0, limite)
}

function datosDelPin(html) {
  for (const m of html.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/gi)) {
    const txt = m[1]; const idx = txt.indexOf('"v3GetPinQuery'); if (idx === -1) continue
    const ini = txt.lastIndexOf('{', idx); let prof = 0, fin = -1
    for (let i = ini; i < txt.length; i++) { if (txt[i] === '{') prof++; else if (txt[i] === '}') { prof--; if (prof === 0) { fin = i; break } } }
    if (fin === -1) continue
    try {
      const encontrado = JSON.parse(txt.slice(ini, fin + 1)); const k = Object.keys(encontrado)[0]
      const pin = k ? encontrado[k]?.data : null
      return !pin || encontrado[k]?.__typename === 'PinNotFound' ? null : pin
    } catch { /* se prueba con el siguiente script */ }
  }
  return null
}

/** Con un enlace de pin devuelve sus datos; con texto, los resultados de la búsqueda. */
export async function pinimg(entrada, limite = 5) {
  if (!esEnlacePin(entrada)) return pinsearch(entrada, limite)
  const resuelta = await resolver(entrada)
  const { texto: html } = await traer(resuelta, { ua: UA_PC, ms: 15000 })
  const limpia = resuelta.split('?')[0].split('/sent/')[0]
  const id = limpia.match(/\/pin\/(\d+)/)?.[1] || ''
  const pin = datosDelPin(html)
  if (pin) {
    const autor = pin.nativeCreator || pin.closeupAttribution || pin.originPinner || {}
    return {
      id, titulo: pin.title || pin.seoTitle || '', descripcion: (pin.description || '').trim() || pin.seoAltText || (pin.gridDescription || '').trim() || '',
      imagen: pin.images_orig?.url || pin.imageLargeUrl || pin.images_736x?.url || '',
      guardados: pin.aggregatedPinData?.aggregatedStats?.saves ?? null, etiquetas: (pin.pinJoin?.seoBreadcrumbs || []).map(b => b.name).filter(Boolean),
      enlace: pin.link || '', autor: autor.fullName || autor.full_name || autor.username || '', url: limpia
    }
  }
  const { imgList } = extraerDeHtml(html)
  if (!imgList.length) throw new Error('No se pudo extraer la imagen del pin')
  return { id, titulo: '', descripcion: '', imagen: imgList[0], guardados: null, etiquetas: [], enlace: '', autor: '', url: limpia }
}
