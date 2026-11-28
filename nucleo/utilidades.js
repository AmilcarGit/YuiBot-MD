// Código Oficial de YuiBot-MD.by AmilcarGit
// IA de charla, noticias, APK y MediaFire. Todo gratis y sin clave; cada función explica el error en español.
import { delirius } from './delirius.js'

const UA = 'YuiBot-MD/1.0 (https://github.com/AmilcarGit/YuiBot-MD)'
const pedirTexto = async (url, ms = 30000) => {
  const r = await fetch(url, { signal: AbortSignal.timeout(ms), headers: { 'User-Agent': UA } })
  if (!r.ok) throw new Error(`HTTP ${r.status}`)
  return r.text()
}

// ── Inteligencia artificial (Pollinations; Delirius de respaldo) ────────────────────
export const MAX_PREGUNTA = 600
export const PERSONALIDAD = 'Eres Yui, una asistente anime amable, alegre y curiosa que vive en WhatsApp. Responde siempre en el idioma del usuario (por defecto español), de forma clara y breve (máximo 6 líneas), con algún emoji ocasional. Si no sabes algo, dilo con honestidad. No inventes datos.'

export async function preguntarIA(pregunta, { sistema = PERSONALIDAD, historial = [] } = {}) {
  const previo = historial.length ? historial.map(h => `${h.de === 'yui' ? 'Yui' : 'Usuario'}: ${h.texto}`).join('\n') + '\n' : ''
  const q = (previo ? `Conversación reciente:\n${previo}\nMensaje nuevo del usuario: ` : '') + String(pregunta).slice(0, MAX_PREGUNTA)
  const errores = []
  try {
    const t = (await pedirTexto(`https://text.pollinations.ai/${encodeURIComponent(q)}?model=openai&system=${encodeURIComponent(sistema)}`, 45000)).trim()
    if (t && !/^\s*[{[]/.test(t)) return t.slice(0, 1800)
    errores.push('respuesta vacía')
  } catch (error) { errores.push(`Pollinations: ${error.message}`) }
  try {
    const d = await delirius('/ia/chatgpt', { q: `${sistema}\n\n${q}` }, { ms: 40000 })
    const t = typeof d.data === 'string' ? d.data : d.data?.response || d.data?.message || d.data?.text || d.data?.result || d.result || ''
    if (String(t).trim()) return String(t).trim().slice(0, 1800)
    errores.push('Delirius: respuesta vacía')
  } catch (error) { errores.push(`Delirius: ${error.message}`) }
  throw new Error(errores.join(' · '))
}

// ── Noticias (Google News en español) ───────────────────────────────────────────────
const PAISES = { pe: 'Perú', mx: 'México', ar: 'Argentina', co: 'Colombia', cl: 'Chile', es: 'España', ve: 'Venezuela', ec: 'Ecuador', bo: 'Bolivia', uy: 'Uruguay', us: 'Estados Unidos', br: 'Brasil' }
export const codigoPais = t => { const c = String(t || '').toLowerCase(); return PAISES[c] ? c : null }
export const nombrePais = c => PAISES[c] || c
const entidades = t => t.replace(/<!\[CDATA\[|\]\]>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").trim()

export function leerNoticias(xml, limite = 6) {
  const items = []
  for (const bloque of String(xml).split('<item>').slice(1)) {
    const titulo = entidades(bloque.match(/<title>([\s\S]*?)<\/title>/)?.[1] || '')
    const enlace = entidades(bloque.match(/<link>([\s\S]*?)<\/link>/)?.[1] || '')
    if (!titulo || !/^https?:\/\//.test(enlace)) continue
    const corte = titulo.lastIndexOf(' - ')
    items.push({ titulo: corte > 10 ? titulo.slice(0, corte) : titulo, fuente: corte > 10 ? titulo.slice(corte + 3) : '', enlace })
    if (items.length >= limite) break
  }
  return items
}
export async function noticias({ pais = 'pe', tema = '', limite = 6 } = {}) {
  const base = tema ? `https://news.google.com/rss/search?q=${encodeURIComponent(tema)}&` : 'https://news.google.com/rss?'
  const lista = leerNoticias(await pedirTexto(`${base}hl=es-419&gl=${pais.toUpperCase()}&ceid=${pais.toUpperCase()}:es-419`), limite)
  if (!lista.length) throw new Error('sin noticias')
  return lista
}

// ── APK y MediaFire ─────────────────────────────────────────────────────────────────
export const MAX_ARCHIVO = 150 * 1024 * 1024
export const tamano = bytes => (bytes >= 1024 ** 3 ? `${(bytes / 1024 ** 3).toFixed(2)} GB` : bytes >= 1024 ** 2 ? `${(bytes / 1024 ** 2).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`)

export async function buscarApk(nombre) {
  const d = (await delirius('/download/apk', { query: nombre }, { ms: 40000 })).data || {}
  if (!/^https?:\/\//.test(d.download || '')) throw new Error('No encontré esa app')
  return { nombre: String(d.name || nombre), paquete: String(d.id || ''), desarrollador: String(d.developer || ''), bytes: Number(d.sizeByte) || 0, peso: String(d.size || ''), descargas: Number(d.stats?.downloads) || 0, actualizado: String(d.publish || '').slice(0, 10), icono: d.image || '', url: d.download }
}
export const esEnlaceMediafire = t => /^https?:\/\/(www\.)?mediafire\.com\/(file|view|download)\//i.test(String(t || '').trim())
export async function mediafire(enlace) {
  const d = (await delirius('/download/mediafire', { url: enlace }, { ms: 40000 })).data
  const x = Array.isArray(d) ? d[0] : d || {}
  const url = [x.download, x.link, x.url, x.downloadUrl].find(u => /^https?:\/\//.test(u || ''))
  if (!url) throw new Error('MediaFire no me dio el archivo')
  const nombre = String(x.filename || x.name || x.title || decodeURIComponent(url.split('?')[0].split('/').pop() || 'archivo')).slice(0, 120)
  return { nombre, peso: String(x.size || x.filesize || ''), tipo: String(x.mime || x.mimetype || x.type || ''), url }
}
