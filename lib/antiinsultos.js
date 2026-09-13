//CÓDIGO ORIGINAL DE YUIBOT-MD
// Filtro de insultos/groserías por grupo, con lista de palabras editable
// y expulsión tras varios avisos. Inspirado en
// commands/grupos/antiinsultos.js de fsociety-bot, adaptado al estilo de YuiBot-MD.

const fs = require('fs')
const path = require('path')
const { escribirJSONAtomico } = require('./escrituraAtomica')

const RUTA_ESTADO = path.join(__dirname, '..', 'data', 'antiinsultos.json')
const RUTA_PALABRAS = path.join(__dirname, '..', 'data', 'insultos-palabras.json')
const MAX_AVISOS = 3

const PALABRAS_DEFECTO = [
  'puta', 'puto', 'mierda', 'carajo', 'idiota', 'imbecil', 'imbécil', 'estupido', 'estúpido',
  'baboso', 'babosa', 'tarado', 'tarada', 'gil', 'bobo', 'boba', 'tonto', 'tonta', 'inutil', 'inútil',
  'pendejo', 'pendeja', 'huevon', 'huevón', 'cabron', 'cabrón', 'cabrona', 'zorra', 'perra',
  'maldito', 'maldita', 'desgraciado', 'desgraciada', 'malparido', 'malparida',
]

function asegurarArchivos() {
  const carpeta = path.dirname(RUTA_ESTADO)
  if (!fs.existsSync(carpeta)) fs.mkdirSync(carpeta, { recursive: true })
  if (!fs.existsSync(RUTA_ESTADO)) escribirJSONAtomico(RUTA_ESTADO, { grupos: {}, avisos: {} })
  if (!fs.existsSync(RUTA_PALABRAS)) escribirJSONAtomico(RUTA_PALABRAS, PALABRAS_DEFECTO)
}

function leerEstado() {
  asegurarArchivos()
  try {
    const data = JSON.parse(fs.readFileSync(RUTA_ESTADO, 'utf-8'))
    return { grupos: data?.grupos || {}, avisos: data?.avisos || {} }
  } catch {
    return { grupos: {}, avisos: {} }
  }
}

function guardarEstado(data) {
  escribirJSONAtomico(RUTA_ESTADO, data)
}

function leerPalabras() {
  asegurarArchivos()
  try {
    const data = JSON.parse(fs.readFileSync(RUTA_PALABRAS, 'utf-8'))
    return Array.isArray(data) ? data : [...PALABRAS_DEFECTO]
  } catch {
    return [...PALABRAS_DEFECTO]
  }
}

function guardarPalabras(lista) {
  escribirJSONAtomico(RUTA_PALABRAS, lista)
}

function estaActivo(jidGrupo) {
  return Boolean(leerEstado().grupos[jidGrupo])
}

function activar(jidGrupo) {
  const data = leerEstado()
  data.grupos[jidGrupo] = true
  guardarEstado(data)
}

function desactivar(jidGrupo) {
  const data = leerEstado()
  data.grupos[jidGrupo] = false
  guardarEstado(data)
}

function normalizarTexto(texto) {
  return String(texto || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function contienePalabraProhibida(texto) {
  const normalizado = normalizarTexto(texto)
  if (!normalizado) return null

  const tokens = new Set(normalizado.split(' ').filter(Boolean))
  const palabras = leerPalabras()

  for (const palabra of palabras) {
    const normalizada = normalizarTexto(palabra)
    if (normalizada && tokens.has(normalizada)) return palabra
  }
  for (const palabra of palabras) {
    const normalizada = normalizarTexto(palabra)
    if (normalizada.includes(' ') && normalizado.includes(normalizada)) return palabra
  }
  return null
}

function registrarAviso(jidGrupo, numero) {
  const data = leerEstado()
  const key = `${jidGrupo}|${numero}`
  data.avisos[key] = (data.avisos[key] || 0) + 1
  guardarEstado(data)
  return { count: data.avisos[key], maxAvisos: MAX_AVISOS, shouldKick: data.avisos[key] >= MAX_AVISOS }
}

function limpiarAvisos(jidGrupo, numero) {
  const data = leerEstado()
  delete data.avisos[`${jidGrupo}|${numero}`]
  guardarEstado(data)
}

module.exports = {
  estaActivo, activar, desactivar, contienePalabraProhibida, registrarAviso, limpiarAvisos,
  leerPalabras, guardarPalabras, MAX_AVISOS,
}