//CÓDIGO ORIGINAL DE YUIBOT-MD
// Gestor central de proveedores de API externas: un solo lugar para
// habilitar/deshabilitar y editar base URLs / keys sin tocar código,
// en vez de tener las keys sueltas en defaults.js.
//
// Inspirado en lib/api-manager.js de fsociety-bot, adaptado al estilo
// (CommonJS + escritura atómica) de YuiBot-MD.

const fs = require('fs')
const path = require('path')
const { escribirJSONAtomico } = require('./escrituraAtomica')
const config = require('../defaults')

const RUTA_DB = path.join(__dirname, '..', 'data', 'api-proveedores.json')

function estadoPorDefecto() {
  // Se siembra una sola vez desde defaults.js.APIS para no perder las keys
  // que ya existían antes de este módulo. A partir de acá, este JSON manda.
  const apis = config.APIS || {}

  return {
    proveedores: {
      lempi: { enabled: true, apiKey: apis.LEMPI_KEY || '' },
      lempi2: { enabled: true, apiKey: apis.LEMPI_KEY_2 || '' },
      evogb: { enabled: true, apiKey: apis.EVOGB_KEY || '' },
      mitzuki: { enabled: true, apiKey: apis.MITZUKI_KEY || '' },
      dvyer: { enabled: true, apiKey: apis.DVYER_KEY || '' },
      ocr: { enabled: true, apiKey: apis.OCR_KEY || '' },
    },
  }
}

function asegurarArchivo() {
  const carpeta = path.dirname(RUTA_DB)
  if (!fs.existsSync(carpeta)) fs.mkdirSync(carpeta, { recursive: true })
  if (!fs.existsSync(RUTA_DB)) escribirJSONAtomico(RUTA_DB, estadoPorDefecto())
}

function leer() {
  asegurarArchivo()
  try {
    const data = JSON.parse(fs.readFileSync(RUTA_DB, 'utf-8'))
    return {
      proveedores: data?.proveedores && typeof data.proveedores === 'object' ? data.proveedores : {},
    }
  } catch {
    return estadoPorDefecto()
  }
}

function guardar(data) {
  escribirJSONAtomico(RUTA_DB, data)
}

function normalizar(nombre) {
  return String(nombre || '').trim().toLowerCase()
}

/** Devuelve la config completa de un proveedor, o null si no existe. */
function obtenerProveedor(nombre) {
  const data = leer()
  const clave = normalizar(nombre)
  return data.proveedores[clave] || null
}

/** ¿Este proveedor está habilitado y tiene apiKey/baseUrl configurados? */
function estaHabilitado(nombre) {
  const proveedor = obtenerProveedor(nombre)
  return Boolean(proveedor && proveedor.enabled !== false)
}

/** Devuelve la apiKey de un proveedor (o '' si no existe / está vacía). */
function obtenerApiKey(nombre) {
  const proveedor = obtenerProveedor(nombre)
  return proveedor?.apiKey || ''
}

/** Actualiza campos de un proveedor (baseUrl, apiKey, enabled, etc). Crea el proveedor si no existía. */
function actualizarProveedor(nombre, cambios = {}) {
  const data = leer()
  const clave = normalizar(nombre)
  if (!clave) return null

  data.proveedores[clave] = { ...(data.proveedores[clave] || {}), ...cambios }
  guardar(data)
  return data.proveedores[clave]
}

function habilitar(nombre) {
  return actualizarProveedor(nombre, { enabled: true })
}

function deshabilitar(nombre) {
  return actualizarProveedor(nombre, { enabled: false })
}

function listar() {
  return leer().proveedores
}

module.exports = {
  obtenerProveedor,
  estaHabilitado,
  obtenerApiKey,
  actualizarProveedor,
  habilitar,
  deshabilitar,
  listar,
}