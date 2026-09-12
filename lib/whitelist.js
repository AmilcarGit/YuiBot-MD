//CÓDIGO ORIGINAL DE YUIBOT-MD
// Whitelist por grupo: números exentos de los filtros anti-* (antilink,
// antiflood, antifake, y los que se vayan agregando). Inspirado en
// lib/group-whitelist.js de fsociety-bot, adaptado al estilo de YuiBot-MD.

const fs = require('fs')
const path = require('path')
const { escribirJSONAtomico } = require('./escrituraAtomica')

const RUTA_DB = path.join(__dirname, '..', 'data', 'whitelist.json')

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

function obtenerWhitelist(jidGrupo) {
  const data = leer()
  return Array.isArray(data[jidGrupo]) ? data[jidGrupo] : []
}

function estaEnWhitelist(jidGrupo, numero) {
  return obtenerWhitelist(jidGrupo).includes(String(numero))
}

function agregarAWhitelist(jidGrupo, numero) {
  const data = leer()
  const lista = Array.isArray(data[jidGrupo]) ? data[jidGrupo] : []
  const num = String(numero)
  const existed = lista.includes(num)
  if (!existed) lista.push(num)
  data[jidGrupo] = lista
  guardar(data)
  return { existed, total: lista.length }
}

function quitarDeWhitelist(jidGrupo, numero) {
  const data = leer()
  const lista = Array.isArray(data[jidGrupo]) ? data[jidGrupo] : []
  const num = String(numero)
  const antes = lista.length
  data[jidGrupo] = lista.filter((n) => n !== num)
  guardar(data)
  return { removed: data[jidGrupo].length < antes, total: data[jidGrupo].length }
}

function limpiarWhitelist(jidGrupo) {
  const data = leer()
  data[jidGrupo] = []
  guardar(data)
}

module.exports = { obtenerWhitelist, estaEnWhitelist, agregarAWhitelist, quitarDeWhitelist, limpiarWhitelist }