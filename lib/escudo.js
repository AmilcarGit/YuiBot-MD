// Escudo de grupo: antidelete, antispam, antiflood y antilink POR GRUPO, con castigo gradual.
// Escalera (los puntos se olvidan tras 24 h sin faltas): 1 aviso · 2 último aviso · 3 silencio 10 min · 4 silencio 1 h · 5 expulsión.
const path = require('path')
const { crearAlmacenCacheado } = require('./escrituraAtomica')

const almacen = crearAlmacenCacheado(path.join(__dirname, '..', 'data', 'escudo.json'), () => ({ grupos: {} }))

const FUNCIONES = ['antidelete', 'antispam', 'antiflood', 'antilink']
const DESCRIPCION = {
  antidelete: 'Reenvía lo que borren',
  antispam: 'Frena mensajes repetidos',
  antiflood: 'Frena ráfagas de mensajes',
  antilink: 'Borra enlaces de quien no es admin',
}
const OLVIDO_MS = 24 * 3600 * 1000
const ESCALERA = [
  { accion: 'aviso' },
  { accion: 'aviso', ultimo: true },
  { accion: 'silencio', ms: 10 * 60000 },
  { accion: 'silencio', ms: 60 * 60000 },
  { accion: 'expulsar' },
]

const leer = () => { const d = almacen.leer(); if (!d.grupos || typeof d.grupos !== 'object') d.grupos = {}; return d }

function configGrupo(jid) {
  const g = leer().grupos[jid] || {}
  return { antidelete: Boolean(g.antidelete), antispam: Boolean(g.antispam), antiflood: Boolean(g.antiflood), antilink: Boolean(g.antilink) }
}

function hayAlgunaActiva(jid) { const c = configGrupo(jid); return FUNCIONES.some((f) => c[f]) }

function ajustar(jid, cambios) {
  const d = leer(); const g = d.grupos[jid] = d.grupos[jid] || {}
  for (const f of FUNCIONES) if (cambios[f] !== undefined) g[f] = Boolean(cambios[f])
  almacen.guardar(d)
  return configGrupo(jid)
}

// ── Castigo gradual ──
function sancionar(jid, numero, ahora = Date.now()) {
  const d = leer(); const g = d.grupos[jid] = d.grupos[jid] || {}
  g.sanciones = g.sanciones || {}
  const s = g.sanciones[numero] = g.sanciones[numero] || { puntos: 0, ultimo: 0, silenciadoHasta: 0 }
  if (ahora - (s.ultimo || 0) > OLVIDO_MS) s.puntos = 0
  s.puntos += 1; s.ultimo = ahora
  const paso = ESCALERA[Math.min(s.puntos, ESCALERA.length) - 1]
  const r = { puntos: s.puntos, total: ESCALERA.length, ...paso }
  if (paso.accion === 'silencio') s.silenciadoHasta = ahora + paso.ms
  if (paso.accion === 'expulsar') { s.puntos = 0; s.silenciadoHasta = 0 }
  almacen.guardar(d)
  return r
}

function silenciar(jid, numero, ms, ahora = Date.now()) {
  const d = leer(); const g = d.grupos[jid] = d.grupos[jid] || {}
  g.sanciones = g.sanciones || {}
  const s = g.sanciones[numero] = g.sanciones[numero] || { puntos: 0, ultimo: 0, silenciadoHasta: 0 }
  s.silenciadoHasta = ahora + ms
  almacen.guardar(d)
  return s.silenciadoHasta
}

function levantar(jid, numero, { limpiarPuntos = false } = {}) {
  const d = leer(); const s = d.grupos[jid]?.sanciones?.[numero]
  if (!s) return false
  s.silenciadoHasta = 0
  if (limpiarPuntos) s.puntos = 0
  almacen.guardar(d)
  return true
}

function restanteSilencio(jid, numero, ahora = Date.now()) {
  const h = leer().grupos[jid]?.sanciones?.[numero]?.silenciadoHasta || 0
  return Math.max(0, h - ahora)
}

function silenciados(jid, ahora = Date.now()) {
  const s = leer().grupos[jid]?.sanciones || {}
  return Object.entries(s).filter(([, v]) => (v.silenciadoHasta || 0) > ahora).map(([numero, v]) => ({ numero, restanteMs: v.silenciadoHasta - ahora }))
}

// ── Detectores (en memoria) ──
const normaliza = (t) => String(t || '').toLowerCase().replace(/\s+/g, ' ').trim()
const repetidos = new Map()
const rafagas = new Map()

/** true cuando el mismo texto se repite `max` veces (o más) dentro de `ventanaMs`. */
function detectarSpam(clave, texto, { ahora = Date.now(), max = 3, ventanaMs = 30000 } = {}) {
  const t = normaliza(texto)
  if (t.length < 2) return false
  const hist = (repetidos.get(clave) || []).filter((x) => ahora - x.t < ventanaMs)
  hist.push({ t: ahora, x: t })
  repetidos.set(clave, hist)
  return hist.filter((x) => x.x === t).length >= max
}

/** true cuando se mandan más de `max` mensajes (cualquiera) dentro de `ventanaMs`. */
function detectarRafaga(clave, { ahora = Date.now(), max = 7, ventanaMs = 6000 } = {}) {
  const hist = (rafagas.get(clave) || []).filter((t) => ahora - t < ventanaMs)
  hist.push(ahora)
  rafagas.set(clave, hist)
  return hist.length > max
}

function limpiarDetectores(clave) { repetidos.delete(clave); rafagas.delete(clave) }

const REGEX_ENLACE = /(https?:\/\/|www\.|chat\.whatsapp\.com\/|wa\.me\/|whatsapp\.com\/channel\/|\b[a-z0-9-]+\.(com|net|org|io|gg|me|xyz|app|ly|tk|ru|cn)\b\/)/i
const tieneEnlace = (t) => REGEX_ENLACE.test(String(t || ''))

// ── Memoria para antidelete ──
const MAX_POR_GRUPO = 150
const VIDA_MS = 30 * 60000
const cache = new Map()

function guardarMensaje(jid, msg, ahora = Date.now()) {
  const id = msg?.key?.id
  if (!id) return
  let g = cache.get(jid); if (!g) { g = new Map(); cache.set(jid, g) }
  g.set(id, { msg, t: ahora })
  if (g.size > MAX_POR_GRUPO) g.delete(g.keys().next().value)
}

function buscarMensaje(jid, id, ahora = Date.now()) {
  const e = cache.get(jid)?.get(id)
  if (!e || ahora - e.t > VIDA_MS) return null
  return e.msg
}

function limpiarCache(ahora = Date.now()) {
  for (const [jid, g] of cache) {
    for (const [id, e] of g) if (ahora - e.t > VIDA_MS) g.delete(id)
    if (!g.size) cache.delete(jid)
  }
}
const limpiador = setInterval(limpiarCache, 5 * 60000); limpiador.unref?.()

const textoDuracion = (ms) => { const m = Math.ceil(ms / 60000); return m >= 60 ? `${Math.round(m / 60 * 10) / 10} h` : `${m} min` }

module.exports = {
  FUNCIONES, DESCRIPCION, ESCALERA, configGrupo, hayAlgunaActiva, ajustar, sancionar, silenciar, levantar, restanteSilencio, silenciados,
  detectarSpam, detectarRafaga, limpiarDetectores, tieneEnlace, guardarMensaje, buscarMensaje, limpiarCache, textoDuracion,
}
