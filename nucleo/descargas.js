// Código Oficial de YuiBot-MD.by AmilcarGit
// Cliente de las APIs de descargas (Nexora para búsqueda y MP3, YOSOYO para MP4).
// Las claves y URLs salen de ajustes.js.
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

/** Busca videos en YouTube. Devuelve [{ url, titulo, duracion, canal, vistas, miniatura }]. */
export async function buscarYoutube(consulta, limite = 6) {
  const { nexora } = ajustes.descargas
  const r = await pedir(nexora, '/api/busqueda/youtube', { query: consulta, apikey: nexora.clave })
  return (r.data || [])
    .filter(v => v.type === 'video' && v.url && !v.isLive)
    .slice(0, limite)
    .map(v => ({ url: v.url, titulo: v.title, duracion: v.duration, canal: v.author?.name, vistas: v.views, miniatura: v.thumbnail || v.image }))
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
