//CÓDIGO ORIGINAL DE YUIBOT-MD
const fs = require('fs')
const path = require('path')
const { escribirJSONAtomico } = require('./escrituraAtomica')

const RUTA_DB = path.join(__dirname, '..', 'data', 'reglas.json')

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

function obtenerReglas(jidGrupo) {
  return leer()[jidGrupo] || ''
}

function establecerReglas(jidGrupo, texto) {
  const data = leer()
  data[jidGrupo] = texto
  guardar(data)
}

function limpiarReglas(jidGrupo) {
  const data = leer()
  delete data[jidGrupo]
  guardar(data)
}

module.exports = { obtenerReglas, establecerReglas, limpiarReglas }