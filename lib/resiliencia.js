//CÓDIGO ORIGINAL DE YUIBOT-MD
// Circuit breaker por comando: si un comando falla varias veces seguidas
// (ej. una API externa caída), se autodeshabilita un rato para no seguir
// fallando en cadena ante cada usuario que lo intente.
//
// Inspirado en el patrón de lib/resilience.js de fsociety-bot, adaptado
// al estilo (CommonJS + escritura atómica) de YuiBot-MD.

const fs = require('fs')
const path = require('path')
const { escribirJSONAtomico } = require('./escrituraAtomica')

const RUTA_DB = path.join(__dirname, '..', 'data', 'resiliencia.json')

const POR_DEFECTO = {
  enabled: true,
  threshold: 4,       // fallos seguidos antes de autodeshabilitar
  windowMs: 10 * 60 * 1000,   // ventana en la que cuentan los fallos (10 min)
  cooldownMs: 15 * 60 * 1000, // tiempo que queda deshabilitado (15 min)
  comandos: {},
}

function asegurarArchivo() {
  const carpeta = path.dirname(RUTA_DB)
  if (!fs.existsSync(carpeta)) fs.mkdirSync(carpeta, { recursive: true })
  if (!fs.existsSync(RUTA_DB)) escribirJSONAtomico(RUTA_DB, POR_DEFECTO)
}

function leer() {
  asegurarArchivo()
  try {
    const data = JSON.parse(fs.readFileSync(RUTA_DB, 'utf-8'))
    return {
      ...POR_DEFECTO,
      ...data,
      comandos: data?.comandos && typeof data.comandos === 'object' ? data.comandos : {},
    }
  } catch {
    return { ...POR_DEFECTO, comandos: {} }
  }
}

function guardar(data) {
  escribirJSONAtomico(RUTA_DB, data)
}

function normalizarNombre(nombre) {
  return String(nombre || '').trim().toLowerCase()
}

function obtenerEntrada(data, nombre) {
  const clave = normalizarNombre(nombre)
  if (!clave) return null
  if (!data.comandos[clave]) {
    data.comandos[clave] = { fallos: [], deshabilitadoHasta: 0, ultimoError: '', ultimoFalloEn: 0 }
  }
  return data.comandos[clave]
}

function limpiarFallosViejos(entrada, windowMs) {
  const ahora = Date.now()
  entrada.fallos = Array.isArray(entrada.fallos)
    ? entrada.fallos.filter((ts) => ahora - Number(ts || 0) <= windowMs)
    : []
}

/**
 * ¿Este comando está actualmente bloqueado por fallos repetidos?
 * Devuelve { bloqueado: boolean, restanteMs?: number }
 */
function estaBloqueado(nombre) {
  const data = leer()
  if (data.enabled === false) return { bloqueado: false }

  const entrada = obtenerEntrada(data, nombre)
  if (!entrada) return { bloqueado: false }

  const ahora = Date.now()
  if (entrada.deshabilitadoHasta > ahora) {
    return { bloqueado: true, restanteMs: entrada.deshabilitadoHasta - ahora, ultimoError: entrada.ultimoError }
  }

  return { bloqueado: false }
}

/**
 * Registra un fallo de ejecución de un comando. Si supera el umbral
 * dentro de la ventana, lo autodeshabilita por cooldownMs.
 */
function registrarFallo(nombre, error) {
  const data = leer()
  if (data.enabled === false) return

  const entrada = obtenerEntrada(data, nombre)
  if (!entrada) return

  limpiarFallosViejos(entrada, data.windowMs)
  entrada.fallos.push(Date.now())
  entrada.ultimoFalloEn = Date.now()
  entrada.ultimoError = String(error?.message || error || 'error desconocido').slice(0, 220)

  if (entrada.fallos.length >= Number(data.threshold || 4)) {
    entrada.deshabilitadoHasta = Date.now() + Number(data.cooldownMs || 0)
    entrada.fallos = []
  }

  guardar(data)
}

/** Registra una ejecución exitosa (limpia el conteo de fallos). */
function registrarExito(nombre) {
  const data = leer()
  const clave = normalizarNombre(nombre)
  if (!clave || !data.comandos[clave]) return

  data.comandos[clave].fallos = []
  guardar(data)
}

/** Fuerza la reactivación manual de un comando bloqueado (uso: comando owner). */
function reiniciarComando(nombre) {
  const data = leer()
  const clave = normalizarNombre(nombre)
  if (!clave || !data.comandos[clave]) return false

  data.comandos[clave].fallos = []
  data.comandos[clave].deshabilitadoHasta = 0
  guardar(data)
  return true
}

function obtenerEstado() {
  const data = leer()
  return {
    enabled: data.enabled !== false,
    threshold: data.threshold,
    windowMs: data.windowMs,
    cooldownMs: data.cooldownMs,
    comandos: data.comandos,
  }
}

function configurar(cambios = {}) {
  const data = leer()
  if (typeof cambios.enabled === 'boolean') data.enabled = cambios.enabled
  if (cambios.threshold !== undefined) data.threshold = Math.max(1, Number(cambios.threshold) || data.threshold)
  if (cambios.windowMs !== undefined) data.windowMs = Math.max(1000, Number(cambios.windowMs) || data.windowMs)
  if (cambios.cooldownMs !== undefined) data.cooldownMs = Math.max(1000, Number(cambios.cooldownMs) || data.cooldownMs)
  guardar(data)
  return obtenerEstado()
}

module.exports = {
  estaBloqueado,
  registrarFallo,
  registrarExito,
  reiniciarComando,
  obtenerEstado,
  configurar,
}