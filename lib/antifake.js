//CÓDIGO ORIGINAL DE YUIBOT-MD
// Antifake: bloquea/expulsa números que no coincidan con los prefijos de
// país permitidos por el grupo. Inspirado en commands/grupos/antifake.js
// de fsociety-bot, adaptado al estilo de YuiBot-MD.

const fs = require('fs')
const path = require('path')
const { escribirJSONAtomico } = require('./escrituraAtomica')

const RUTA_DB = path.join(__dirname, '..', 'data', 'antifake.json')
const PREFIJOS_DEFECTO = ['51', '52', '53', '54', '55', '56', '57', '58', '591', '593', '595', '598']

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
  const cfg = data[jidGrupo]
  return {
    enabled: Boolean(cfg?.enabled),
    prefijos: Array.isArray(cfg?.prefijos) && cfg.prefijos.length ? cfg.prefijos : [...PREFIJOS_DEFECTO],
  }
}

function guardarConfig(jidGrupo, cambios) {
  const data = leer()
  data[jidGrupo] = { ...obtenerConfig(jidGrupo), ...cambios }
  guardar(data)
  return data[jidGrupo]
}

function numeroPermitido(numero, cfg) {
  const limpio = String(numero || '').replace(/[^0-9]/g, '')
  return cfg.prefijos.some((prefijo) => limpio.startsWith(prefijo))
}

module.exports = { obtenerConfig, guardarConfig, numeroPermitido, PREFIJOS_DEFECTO }