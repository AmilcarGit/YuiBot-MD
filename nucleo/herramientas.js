// Código Oficial de YuiBot-MD.by AmilcarGit
// Herramientas de uso diario: calculadora, traductor, Wikipedia, divisas y acortador. Todo gratis y sin claves.

async function pedir(url, { json = true, ms = 12000 } = {}) {
  const r = await fetch(url, { signal: AbortSignal.timeout(ms), headers: { 'User-Agent': 'YuiBot-MD/1.0 (https://github.com/AmilcarGit/YuiBot-MD)' } })
  if (!r.ok) { const e = new Error(`HTTP ${r.status}`); e.status = r.status; throw e }
  return json ? r.json() : r.text()
}

// ── Calculadora (sin eval: tokens + shunting-yard) ───────────────────────────────
const FUNCIONES = { sqrt: Math.sqrt, raiz: Math.sqrt, abs: Math.abs, round: Math.round, redondear: Math.round, floor: Math.floor, ceil: Math.ceil, sin: Math.sin, cos: Math.cos, tan: Math.tan, ln: Math.log, log: Math.log10, exp: Math.exp }
const CONSTANTES = { pi: Math.PI, e: Math.E }
const PREC = { '+': 1, '-': 1, '*': 2, '/': 2, '%': 2, '^': 4, neg: 3 }

export function calcular(texto) {
  let t = String(texto).toLowerCase().replace(/×|x(?=\s*[\d(])/g, '*').replace(/÷/g, '/').replace(/,/g, '.').replace(/\s+/g, '')
  // "20% de 150" → 20/100*150
  t = t.replace(/(\d+(?:\.\d+)?)%de(\d+(?:\.\d+)?)/g, '($1/100*$2)')
  if (!t || t.length > 120) throw new Error('Escribe una operación, por ejemplo 12*(3+4)')
  const fichas = []
  const re = /(\d+(?:\.\d+)?|\.\d+)|([a-z]+)|(.)/g
  for (let m; (m = re.exec(t));) {
    if (m[1]) fichas.push({ n: Number(m[1]) })
    else if (m[2]) fichas.push(m[2] in CONSTANTES ? { n: CONSTANTES[m[2]] } : m[2] in FUNCIONES ? { f: m[2] } : (() => { throw new Error(`No entiendo "${m[2]}"`) })())
    else if ('+-*/%^()'.includes(m[3])) fichas.push({ o: m[3] })
    else throw new Error(`Símbolo no permitido: ${m[3]}`)
  }
  const salida = []; const pila = []
  let previo = null
  for (const f of fichas) {
    if (f.n !== undefined) salida.push(f)
    else if (f.f) pila.push(f)
    else if (f.o === '(') pila.push(f)
    else if (f.o === ')') {
      while (pila.length && pila.at(-1).o !== '(') salida.push(pila.pop())
      if (!pila.length) throw new Error('Paréntesis sin pareja')
      pila.pop()
      if (pila.at(-1)?.f) salida.push(pila.pop())
    } else {
      const unario = f.o === '-' && (previo === null || previo.o && previo.o !== ')')
      const op = unario ? { o: 'neg' } : f
      while (pila.length && pila.at(-1).o && pila.at(-1).o !== '(' && (PREC[pila.at(-1).o] > PREC[op.o] || (PREC[pila.at(-1).o] === PREC[op.o] && op.o !== '^' && op.o !== 'neg'))) salida.push(pila.pop())
      pila.push(op)
    }
    previo = f
  }
  while (pila.length) { const x = pila.pop(); if (x.o === '(') throw new Error('Paréntesis sin pareja'); salida.push(x) }
  const v = []
  for (const f of salida) {
    if (f.n !== undefined) v.push(f.n)
    else if (f.f) { if (!v.length) throw new Error('Falta un número'); v.push(FUNCIONES[f.f](v.pop())) }
    else if (f.o === 'neg') { if (!v.length) throw new Error('Falta un número'); v.push(-v.pop()) }
    else {
      if (v.length < 2) throw new Error('Operación incompleta')
      const b = v.pop(); const a = v.pop()
      v.push({ '+': a + b, '-': a - b, '*': a * b, '/': a / b, '%': a % b, '^': a ** b }[f.o])
    }
  }
  if (v.length !== 1 || !Number.isFinite(v[0])) throw new Error('El resultado no es un número válido (¿dividiste entre cero?)')
  return Math.round(v[0] * 1e10) / 1e10
}

// ── Traductor (Google, sin clave) ──────────────────────────────────────────────────
export const IDIOMAS = {
  es: 'Español', en: 'Inglés', pt: 'Portugués', fr: 'Francés', de: 'Alemán', it: 'Italiano', ja: 'Japonés', ko: 'Coreano',
  zh: 'Chino', 'zh-cn': 'Chino', ru: 'Ruso', ar: 'Árabe', hi: 'Hindi', tr: 'Turco', nl: 'Neerlandés', pl: 'Polaco', la: 'Latín', ca: 'Catalán', id: 'Indonesio', vi: 'Vietnamita', th: 'Tailandés', sv: 'Sueco', uk: 'Ucraniano', el: 'Griego', he: 'Hebreo'
}
const NOMBRES = { espanol: 'es', español: 'es', castellano: 'es', ingles: 'en', inglés: 'en', english: 'en', portugues: 'pt', portugués: 'pt', frances: 'fr', francés: 'fr', aleman: 'de', alemán: 'de', italiano: 'it', japones: 'ja', japonés: 'ja', coreano: 'ko', chino: 'zh', ruso: 'ru', arabe: 'ar', árabe: 'ar', turco: 'tr', latin: 'la', latín: 'la' }
export const codigoIdioma = t => { const x = String(t || '').toLowerCase(); return IDIOMAS[x] ? x : NOMBRES[x] || null }

const DELIRIUS = (process.env.DELIRIUS_URL || 'https://api.delirius.online').replace(/\/$/, '')

/** Traduce con la API de Delirius (gratis, sin clave) y, si falla, con Google. Devuelve { traduccion, origen }. */
export async function traducir(texto, destino = 'es') {
  const corto = texto.slice(0, 1500)
  let motivo
  try {
    const d = await pedir(`${DELIRIUS}/tools/translate?text=${encodeURIComponent(corto)}&language=${encodeURIComponent(destino)}`)
    const t = typeof d?.data === 'string' ? d.data : d?.data?.text || d?.data?.translation
    if (d?.status !== false && t) return { traduccion: String(t), origen: '' }
    motivo = 'Delirius no devolvió traducción'
  } catch (error) { motivo = `Delirius: ${error.message}` }
  try {
    const d = await pedir(`https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${encodeURIComponent(destino)}&dt=t&q=${encodeURIComponent(corto)}`)
    const traduccion = (d?.[0] || []).map(x => x?.[0] || '').join('')
    if (traduccion) return { traduccion, origen: d?.[2] || '' }
    motivo += ' · Google sin resultado'
  } catch (error) { motivo += ` · Google: ${error.message}` }
  throw new Error(motivo)
}

// El último texto que cada persona tradujo: así los botones de idioma no tienen que llevar el texto dentro.
const recientes = new Map()
export function recordarTexto(clave, texto) {
  recientes.set(String(clave), { texto, hasta: Date.now() + 3600e3 })
  if (recientes.size > 500) recientes.delete(recientes.keys().next().value)
}
export function textoGuardado(clave) {
  const r = recientes.get(String(clave))
  return r && r.hasta > Date.now() ? r.texto : ''
}

// ── Wikipedia ───────────────────────────────────────────────────────────────────────
export async function wikipedia(tema, idioma = 'es') {
  const base = `https://${idioma}.wikipedia.org`
  const resumen = async titulo => pedir(`${base}/api/rest_v1/page/summary/${encodeURIComponent(titulo)}?redirect=true`)
  let d
  try { d = await resumen(tema) } catch (error) {
    if (error.status !== 404) throw error
    const [, titulos] = await pedir(`${base}/w/api.php?action=opensearch&search=${encodeURIComponent(tema)}&limit=1&format=json`)
    if (!titulos?.[0]) return null
    d = await resumen(titulos[0])
  }
  if (!d?.extract) return null
  return { titulo: d.title, descripcion: d.description || '', texto: d.extract, imagen: d.thumbnail?.source || '', enlace: d.content_urls?.desktop?.page || '', desambiguacion: d.type === 'disambiguation' }
}

// ── Divisas ─────────────────────────────────────────────────────────────────────────
const ALIAS_MONEDA = { dolar: 'USD', dólar: 'USD', dolares: 'USD', dólares: 'USD', euro: 'EUR', euros: 'EUR', sol: 'PEN', soles: 'PEN', peso: 'MXN', pesos: 'MXN', libra: 'GBP', yen: 'JPY', real: 'BRL', reales: 'BRL' }
export const codigoMoneda = t => { const x = String(t || '').toLowerCase(); return ALIAS_MONEDA[x] || (/^[a-z]{3}$/.test(x) ? x.toUpperCase() : null) }

export async function convertir(cantidad, de, a) {
  const d = await pedir(`https://open.er-api.com/v6/latest/${de}`)
  if (d.result !== 'success') throw new Error(`No conozco la moneda ${de}`)
  const tasa = d.rates?.[a]
  if (!tasa) throw new Error(`No conozco la moneda ${a}`)
  return { resultado: cantidad * tasa, tasa, actualizado: d.time_last_update_utc || '' }
}

// ── Acortador de enlaces ────────────────────────────────────────────────────────────
export async function acortar(enlace) {
  const d = await pedir(`https://is.gd/create.php?format=json&url=${encodeURIComponent(enlace)}`)
  if (!d.shorturl) throw new Error(d.errormessage || 'No pude acortar ese enlace')
  return d.shorturl
}

export const esEnlace = t => /^https?:\/\/[^\s.]+\.[^\s]+$/i.test(String(t || '').trim())
export const urlQr = texto => `https://api.qrserver.com/v1/create-qr-code/?size=600x600&margin=10&data=${encodeURIComponent(texto)}`
