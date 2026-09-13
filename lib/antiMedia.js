//CÓDIGO ORIGINAL DE YUIBOT-MD
// Estado + conteo de avisos para los filtros de tipo de contenido
// (antiaudio, antidocumento, antiimagen, antisticker, antivideo).
// Inspirado en commands/grupos/_antiMedia.js de fsociety-bot, adaptado
// al estilo de YuiBot-MD.

const fs = require('fs')
const path = require('path')
const { escribirJSONAtomico } = require('./escrituraAtomica')

const RUTA_DB = path.join(__dirname, '..', 'data', 'antimedia.json')

function asegurarArchivo() {
  const carpeta = path.dirname(RUTA_DB)
  if (!fs.existsSync(carpeta)) fs.mkdirSync(carpeta, { recursive: true })
  if (!fs.existsSync(RUTA_DB)) escribirJSONAtomico(RUTA_DB, { grupos: {} })
}

function leer() {
  asegurarArchivo()
  try {
    const data = JSON.parse(fs.readFileSync(RUTA_DB, 'utf-8'))
    return data?.grupos && typeof data.grupos === 'object' ? data : { grupos: {} }
  } catch {
    return { grupos: {} }
  }
}

function guardar(data) {
  escribirJSONAtomico(RUTA_DB, data)
}

const ESTADO_POR_DEFECTO = { image: false, sticker: false, video: false, audio: false, document: false, maxAvisos: 3, avisos: {} }

function estadoGrupo(jidGrupo) {
  const data = leer()
  return { ...ESTADO_POR_DEFECTO, ...(data.grupos[jidGrupo] || {}) }
}

function estaActivo(jidGrupo, tipo) {
  return Boolean(estadoGrupo(jidGrupo)[tipo])
}

function establecerEstado(jidGrupo, tipo, activo) {
  const data = leer()
  data.grupos[jidGrupo] = { ...estadoGrupo(jidGrupo), [tipo]: activo }
  guardar(data)
  return data.grupos[jidGrupo]
}

function registrarAviso(jidGrupo, numero) {
  const data = leer()
  const actual = estadoGrupo(jidGrupo)
  const avisos = { ...(actual.avisos || {}) }
  avisos[numero] = (avisos[numero] || 0) + 1
  data.grupos[jidGrupo] = { ...actual, avisos }
  guardar(data)
  return { count: avisos[numero], maxAvisos: actual.maxAvisos || 3, shouldKick: avisos[numero] >= (actual.maxAvisos || 3) }
}

function limpiarAvisos(jidGrupo, numero) {
  const data = leer()
  const actual = estadoGrupo(jidGrupo)
  const avisos = { ...(actual.avisos || {}) }
  delete avisos[numero]
  data.grupos[jidGrupo] = { ...actual, avisos }
  guardar(data)
}

module.exports = { estadoGrupo, estaActivo, establecerEstado, registrarAviso, limpiarAvisos }