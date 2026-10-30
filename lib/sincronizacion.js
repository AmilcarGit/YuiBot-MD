// Sincronización con la base de datos compartida (repositorio YuiBot-datos desplegado en Vercel).
//
// Idea: el bot SIGUE trabajando con sus archivos locales (data/usuarios.json y data/trabajos.json). Cada
// pocos minutos manda al servidor "cuánto cambió" cada persona desde la última vez (deltas) y recibe el
// total oficial, que mezcla lo que hicieron todas las instalaciones. Si el servidor no responde no pasa nada:
// los cambios se acumulan y se mandan cuando vuelva.
//
//   monedas, xp, mensajes, reputación, veces y ganancia de trabajos → se SUMAN entre instalaciones
//   mejoras, rachas, tiempos de espera → se queda el mayor · inventario y logros → se juntan
//   lo demás (nombre, edad, boosts…) → gana el registro más reciente
//
// Lo que cambie en el bot mientras llega la respuesta no se pierde: se vuelve a sumar sobre el total oficial.
const fs = require('fs')
const path = require('path')
const crypto = require('crypto')
const { escribirJSONAtomico } = require('./escrituraAtomica')
const { fetchSeguro } = require('./http')
const db = require('./db')
const trabajos = require('./trabajos')

const RAIZ = path.join(__dirname, '..')
const RUTA_CLAVE = path.join(RAIZ, 'data', 'sync-clave.json')
const RUTA_BASE = path.join(RAIZ, 'data', 'sync-base.json')
const RUTA_PENDIENTE = path.join(RAIZ, 'data', 'sync-pendiente.json')

const ADITIVOS = ['monedas', 'xp', 'mensajes', 'reputacion', 'trabajosVeces', 'trabajosGanado']
const NO_NEGATIVOS = new Set(['monedas', 'xp', 'mensajes', 'trabajosVeces', 'trabajosGanado'])
const MAXIMOS_T = ['cd', 'mejoras']
const DIA_MS = 24 * 3600 * 1000
const MAX_LOTES_POR_CICLO = 5

const num = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0)
const esObj = (v) => v && typeof v === 'object' && !Array.isArray(v)
const nivelDe = (xp) => Math.floor(Math.sqrt(Math.max(0, xp) / 100))

// ── Ajustes ───────────────────────────────────────────────────────────
function leerAjustes(config = {}, env = process.env) {
  const c = config.SYNC || {}
  const url = String(env.SYNC_URL || c.URL || '').trim().replace(/\/+$/, '')
  const apagado = String(env.SYNC_ENABLED || '').toLowerCase() === 'false' || c.ENABLED === false
  const valida = /^https?:\/\/[^\s/]+/i.test(url)
  return {
    activo: Boolean(valida && !apagado),
    url,
    motivo: apagado ? 'apagada en la configuración' : !url ? 'sin URL (falta SYNC.URL o SYNC_URL)' : !valida ? 'la URL no es válida' : '',
    intervaloMs: Math.max(30000, num(c.INTERVALO_MS) || 120000),
    lote: Math.min(200, Math.max(10, Math.trunc(num(c.LOTE)) || 100)),
  }
}

const leerJson = (ruta, porDefecto) => { try { return JSON.parse(fs.readFileSync(ruta, 'utf8')) } catch { return porDefecto } }
const mascara = (numero) => { const n = String(numero); return n.length >= 8 ? `${n.slice(0, 3)}•••${n.slice(-3)}` : '•••' }

// ── Cálculo de cambios (deltas) ───────────────────────────────────────
/** Cuánto cambió una persona desde la última sincronización. */
function deltasUsuario(rec, base) {
  const d = {}
  for (const f of ADITIVOS) { const x = num(rec[f]) - num(base?.[f]); if (x) d[f] = x }
  // XP de la semana: dentro de la misma semana se suma la diferencia; en una semana nueva, todo lo de esta semana.
  if (rec.semana) {
    const x = base?.semana === rec.semana ? num(rec.xpSemana) - num(base?.xpSemana) : num(rec.xpSemana)
    if (x) d.xpSemana = x
  }
  return d
}

function deltasTrabajos(rec, base) {
  const d = { ganado: num(rec.ganado) - num(base?.ganado), veces: {} }
  for (const [k, v] of Object.entries(esObj(rec.veces) ? rec.veces : {})) { const x = num(v) - num(base?.veces?.[k]); if (x > 0) d.veces[k] = x }
  return d
}

const hayCambio = (d) => Object.keys(d).length > 0
const hayCambioT = (d) => d.ganado !== 0 || Object.keys(d.veces).length > 0

const fotoU = (rec) => ({ ...Object.fromEntries(ADITIVOS.map((f) => [f, num(rec[f])])), semana: rec.semana || '', xpSemana: num(rec.xpSemana), actualizado: num(rec.actualizado) })
const fotoT = (rec) => ({ ganado: num(rec.ganado), veces: { ...(esObj(rec.veces) ? rec.veces : {}) }, actualizado: num(rec.actualizado) })

/**
 * Arma los lotes a enviar. Primero van los que tienen cambios; luego los activos de las últimas 24 h
 * (solo para recibir lo que hicieron en otras instalaciones).
 */
function prepararLotes({ usuarios, trabajosTodos, base, ahora = Date.now(), lote = 100 }) {
  const numeros = new Set([...Object.keys(usuarios), ...Object.keys(trabajosTodos)])
  const cola = []
  for (const n of numeros) {
    if (!/^\d{6,16}$/.test(n)) continue
    const u = usuarios[n]; const t = trabajosTodos[n]
    const bu = base.usuarios?.[n]; const bt = base.trabajos?.[n]
    const du = u ? deltasUsuario(u, bu) : {}
    const dt = t ? deltasTrabajos(t, bt) : { ganado: 0, veces: {} }
    const reciente = Math.max(num(u?.actualizado), num(t?.actualizado)) >= ahora - DIA_MS
    const nuevo = (u && !bu) || (t && !bt)
    if (!(hayCambio(du) || hayCambioT(dt) || nuevo || reciente)) continue
    cola.push({ n, prioridad: hayCambio(du) || hayCambioT(dt) || nuevo ? 0 : 1, u, t, du, dt, semilla: Boolean(u && !bu) })
  }
  cola.sort((a, b) => a.prioridad - b.prioridad)
  const lotes = []
  for (let i = 0; i < cola.length; i += lote) lotes.push(cola.slice(i, i + lote))
  return lotes
}

function armarCuerpo(items, rid) {
  const usuarios = {}
  const enviado = {}
  for (const it of items) {
    const entrada = { vis: mascara(it.n) }
    enviado[it.n] = {}
    if (it.u) { entrada.u = { r: it.u, d: it.du, ...(it.semilla ? { semilla: true } : {}) }; enviado[it.n].u = fotoU(it.u) }
    if (it.t) { entrada.t = { r: it.t, d: it.dt }; enviado[it.n].t = fotoT(it.t) }
    usuarios[it.n] = entrada
  }
  return { cuerpo: { v: 1, rid, usuarios }, enviado }
}

// ── Aplicar la respuesta del servidor ─────────────────────────────────
/**
 * Mezcla el total oficial con lo local. Lo que cambió localmente mientras la petición viajaba
 * (`actual - enviado`) se suma sobre el total oficial, así no se pierde nada.
 */
function aplicarUsuario(actual, oficial, env) {
  const cur = actual || {}
  const nuevo = (cur.actualizado || 0) > (env.actualizado || 0) ? { ...oficial, ...cur } : { ...cur, ...oficial }
  for (const f of ADITIVOS) {
    if (oficial[f] === undefined && cur[f] === undefined) continue
    const total = num(oficial[f]) + (num(cur[f]) - num(env[f]))
    nuevo[f] = NO_NEGATIVOS.has(f) ? Math.max(0, total) : total
  }
  if (oficial.semana && cur.semana === env.semana && oficial.semana === cur.semana) {
    nuevo.semana = oficial.semana
    nuevo.xpSemana = Math.max(0, num(oficial.xpSemana) + (num(cur.xpSemana) - num(env.xpSemana)))
  } else if (!cur.semana || String(oficial.semana || '') >= String(cur.semana)) {
    if (oficial.semana) { nuevo.semana = oficial.semana; nuevo.xpSemana = num(oficial.xpSemana) }
  }
  for (const f of ['mejorRacha', 'ultimoDaily', 'ultimoXp', 'mejorasTotal']) if (oficial[f] !== undefined || cur[f] !== undefined) nuevo[f] = Math.max(num(oficial[f]), num(cur[f]))
  nuevo.inventario = [...new Set([...(Array.isArray(oficial.inventario) ? oficial.inventario : []), ...(Array.isArray(cur.inventario) ? cur.inventario : [])])]
  if (!nuevo.inventario.length) delete nuevo.inventario
  if (esObj(oficial.logros) || esObj(cur.logros)) nuevo.logros = { ...(esObj(oficial.logros) ? oficial.logros : {}), ...(esObj(cur.logros) ? cur.logros : {}) }
  nuevo.nivel = nivelDe(nuevo.xp || 0)
  nuevo.actualizado = Math.max(num(oficial.actualizado), num(cur.actualizado))
  return nuevo
}

function aplicarTrabajos(actual, oficial, env) {
  const cur = actual || {}
  const nuevo = { cd: {}, veces: {}, ganado: 0, granja: [], mejoras: {} }
  for (const campo of MAXIMOS_T) {
    for (const k of new Set([...Object.keys(esObj(oficial[campo]) ? oficial[campo] : {}), ...Object.keys(esObj(cur[campo]) ? cur[campo] : {})])) nuevo[campo][k] = Math.max(num(oficial[campo]?.[k]), num(cur[campo]?.[k]))
  }
  for (const k of new Set([...Object.keys(esObj(oficial.veces) ? oficial.veces : {}), ...Object.keys(esObj(cur.veces) ? cur.veces : {})])) nuevo.veces[k] = Math.max(0, num(oficial.veces?.[k]) + (num(cur.veces?.[k]) - num(env.veces?.[k])))
  nuevo.ganado = Math.max(0, num(oficial.ganado) + (num(cur.ganado) - num(env.ganado)))
  nuevo.granja = (cur.actualizado || 0) > (env.actualizado || 0) ? (cur.granja || []) : (oficial.granja || cur.granja || [])
  nuevo.actualizado = Math.max(num(oficial.actualizado), num(cur.actualizado))
  return nuevo
}

// ── Estado y cliente HTTP ─────────────────────────────────────────────
const estado = { ultimoOk: null, ultimoError: null, ultimosUsuarios: 0, enCurso: false, programado: false, bloqueada: false, fallosSeguidos: 0, saltarCiclos: 0 }

async function llamar(ajustes, metodo, ruta, { cuerpo, cabeceras = {}, fetchFn = fetchSeguro } = {}) {
  const res = await fetchFn(`${ajustes.url}${ruta}`, {
    method: metodo,
    headers: { 'Content-Type': 'application/json', 'User-Agent': 'YuiBot-MD-sync', ...cabeceras },
    body: cuerpo ? JSON.stringify(cuerpo) : undefined,
  })
  let datos = null
  try { datos = await res.json() } catch { /* sin cuerpo */ }
  if (!res.ok) { const e = new Error(datos?.error || `El servidor respondió ${res.status}`); e.status = res.status; throw e }
  return datos
}

async function asegurarInstalacion(ajustes, fetchFn, { rutaClave = RUTA_CLAVE, forzar = false } = {}) {
  const guardada = leerJson(rutaClave, null)
  if (guardada?.id && guardada?.clave && !forzar) return guardada
  const r = await llamar(ajustes, 'POST', '/api/registrar', { cuerpo: { v: 1 }, fetchFn })
  if (!r?.id || !r?.clave) throw new Error('El servidor no devolvió una instalación válida.')
  escribirJSONAtomico(rutaClave, { id: r.id, clave: r.clave, creado: Date.now() })
  return { id: r.id, clave: r.clave }
}

function aplicarRespuesta(respuesta, enviado, base) {
  const oficial = respuesta?.usuarios || {}
  const numeros = Object.keys(oficial).filter((n) => enviado[n])
  if (!numeros.length) return 0
  db.transaccionUsuarios((data) => {
    for (const n of numeros) {
      const u = oficial[n]?.u
      if (!u || !enviado[n].u) continue
      data[n] = aplicarUsuario(data[n], u, enviado[n].u)
      base.usuarios[n] = fotoU(u)
    }
  })
  trabajos.transaccion((todos) => {
    for (const n of numeros) {
      const t = oficial[n]?.t
      if (!t || !enviado[n].t) continue
      todos[n] = aplicarTrabajos(todos[n], t, enviado[n].t)
      base.trabajos[n] = fotoT(t)
    }
  })
  return numeros.length
}

/** Un ciclo: reintenta lo pendiente y manda los cambios nuevos. → { enviados, lotes } */
async function sincronizarAhora({ ajustes, fetchFn = fetchSeguro, ahora = Date.now(), rutas = {} } = {}) {
  const rBase = rutas.base || RUTA_BASE; const rPend = rutas.pendiente || RUTA_PENDIENTE; const rClave = rutas.clave || RUTA_CLAVE
  if (!ajustes?.activo) throw new Error(`Sincronización apagada (${ajustes?.motivo || 'sin configurar'}).`)
  if (estado.enCurso) return { ocupado: true }
  estado.enCurso = true
  try {
    let inst = await asegurarInstalacion(ajustes, fetchFn, { rutaClave: rClave })
    const base = leerJson(rBase, null) || { usuarios: {}, trabajos: {} }
    base.usuarios ||= {}; base.trabajos ||= {}
    let enviados = 0; let lotesHechos = 0

    const enviar = async (cuerpo) => {
      const intento = async () => llamar(ajustes, 'POST', '/api/sync', { cuerpo, cabeceras: { 'x-instalacion': inst.id, 'x-clave': inst.clave }, fetchFn })
      try { return await intento() } catch (e) {
        if (e.status !== 401) throw e
        inst = await asegurarInstalacion(ajustes, fetchFn, { rutaClave: rClave, forzar: true }) // el servidor no nos conoce: nos registramos de nuevo
        return intento()
      }
    }

    // 1) Un envío anterior que no llegó a confirmarse: se repite IGUAL (misma rid) y el servidor no lo cuenta dos veces.
    const pendiente = leerJson(rPend, null)
    if (pendiente?.cuerpo && pendiente?.enviado) {
      const resp = await enviar(pendiente.cuerpo)
      enviados += aplicarRespuesta(resp, pendiente.enviado, base)
      escribirJSONAtomico(rBase, base)
      fs.rmSync(rPend, { force: true })
      lotesHechos++
    }

    // 2) Cambios nuevos, por lotes.
    const lotes = prepararLotes({ usuarios: db.listarUsuarios(), trabajosTodos: trabajos.todos(), base, ahora, lote: ajustes.lote })
    for (const lote of lotes.slice(0, MAX_LOTES_POR_CICLO)) {
      const { cuerpo, enviado } = armarCuerpo(lote, crypto.randomUUID())
      escribirJSONAtomico(rPend, { cuerpo, enviado }) // por si se corta antes de la respuesta
      const resp = await enviar(cuerpo)
      enviados += aplicarRespuesta(resp, enviado, base)
      escribirJSONAtomico(rBase, base)
      fs.rmSync(rPend, { force: true })
      lotesHechos++
    }
    estado.ultimoOk = Date.now(); estado.ultimoError = null; estado.ultimosUsuarios = enviados; estado.fallosSeguidos = 0
    return { enviados, lotes: lotesHechos, pendientes: Math.max(0, lotes.length - MAX_LOTES_POR_CICLO) }
  } catch (e) {
    estado.ultimoError = e.message
    throw e
  } finally {
    estado.enCurso = false
  }
}

/** Programa la sincronización automática. Si falla, espera cada vez más (hasta ~30 min) y avisa una sola vez. */
function iniciar({ ajustes, log = console.log, avisar = null, fetchFn, rutas, primerRetrasoMs = 20000 } = {}) {
  if (!ajustes?.activo) return () => {}
  estado.programado = true
  let avisado = false
  const ciclo = async () => {
    if (estado.bloqueada) return
    if (estado.saltarCiclos > 0) { estado.saltarCiclos--; return }
    try {
      const r = await sincronizarAhora({ ajustes, fetchFn, rutas })
      if (r.ocupado) return
      if (r.enviados) log(`☁️ [SYNC] ${r.enviados} usuario(s) sincronizado(s) con la base compartida.`)
      if (avisado) { avisado = false; try { await avisar?.('✅ La base de datos compartida volvió a responder.') } catch { /* sin chat */ } }
    } catch (e) {
      estado.fallosSeguidos++
      estado.saltarCiclos = Math.min(2 ** Math.min(estado.fallosSeguidos, 5) - 1, 14)
      if (e.status === 403) { estado.bloqueada = true; log(`⛔ [SYNC] ${e.message} Dejo de sincronizar.`) } else log(`⚠️ [SYNC] ${e.message}`)
      if (!avisado && estado.fallosSeguidos >= 3) { avisado = true; try { await avisar?.(`⚠️ No puedo hablar con la base de datos compartida:\n${e.message}\n\nSigo funcionando con los datos locales y reintento solo.`) } catch { /* sin chat */ } }
    }
  }
  const primero = setTimeout(ciclo, primerRetrasoMs)
  const intervalo = setInterval(ciclo, ajustes.intervaloMs)
  primero.unref?.(); intervalo.unref?.()
  return () => { clearTimeout(primero); clearInterval(intervalo); estado.programado = false }
}

/** Ranking global desde el servidor. */
async function topGlobal({ ajustes, campo = 'monedas', limite = 10, fetchFn = fetchSeguro }) {
  if (!ajustes?.activo) throw new Error('La base compartida no está configurada.')
  const r = await llamar(ajustes, 'GET', `/api/top?campo=${encodeURIComponent(campo)}&limite=${Math.min(25, Math.max(1, Math.trunc(Number(limite)) || 10))}`, { fetchFn })
  return r.top || []
}

module.exports = { leerAjustes, deltasUsuario, deltasTrabajos, prepararLotes, armarCuerpo, aplicarUsuario, aplicarTrabajos, aplicarRespuesta, sincronizarAhora, iniciar, topGlobal, estado, mascara, ADITIVOS }
