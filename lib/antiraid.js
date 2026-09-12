//CÓDIGO ORIGINAL DE YUIBOT-MD
// Antiraid: si entran muchos miembros nuevos en poco tiempo, cierra el
// grupo (solo admins pueden escribir) un rato. Inspirado en
// commands/grupos/antiraid.js de fsociety-bot, adaptado al estilo de YuiBot-MD.

const fs = require('fs')
const path = require('path')
const { escribirJSONAtomico } = require('./escrituraAtomica')

const RUTA_DB = path.join(__dirname, '..', 'data', 'antiraid.json')

const POR_DEFECTO_GRUPO = { enabled: false, limite: 5, ventanaSegundos: 20, minutosBloqueo: 5, bloqueadoHasta: 0 }

function asegurarArchivo() {
  const carpeta = path.dirname(RUTA_DB)
  if (!fs.existsSync(carpeta)) fs.mkdirSync(carpeta, { recursive: true })
  if (!fs.existsSync(RUTA_DB)) escribirJSONAtomico(RUTA_DB, {})
}

function leer() {
  asegurarArchivo()
  try {
    const data = JSON.parse(fs.readFileSync(RUTA_DB, 'utf-8'))
    return data && typeof data === 'object' ? data : {}
  } catch {
    return {}
  }
}

function guardar(data) {
  escribirJSONAtomico(RUTA_DB, data)
}

function obtenerConfig(jidGrupo) {
  const data = leer()
  return { ...POR_DEFECTO_GRUPO, ...(data[jidGrupo] || {}) }
}

function guardarConfig(jidGrupo, cambios) {
  const data = leer()
  data[jidGrupo] = { ...POR_DEFECTO_GRUPO, ...(data[jidGrupo] || {}), ...cambios }
  guardar(data)
  return data[jidGrupo]
}

// Historial de entradas recientes en memoria — no necesita persistirse:
// si el bot se reinicia, simplemente se reinicia el conteo, sin problema.
const entradasRecientes = new Map()

function registrarEntradas(jidGrupo, cantidad, ventanaMs) {
  const ahora = Date.now()
  const historial = (entradasRecientes.get(jidGrupo) || []).filter((t) => ahora - t <= ventanaMs)
  for (let i = 0; i < cantidad; i++) historial.push(ahora)
  entradasRecientes.set(jidGrupo, historial)
  return historial.length
}

function limpiarEntradas(jidGrupo) {
  entradasRecientes.set(jidGrupo, [])
}

module.exports = { obtenerConfig, guardarConfig, registrarEntradas, limpiarEntradas }