//CÓDIGO ORIGINAL DE YUIBOT-MD
// Botgrupo: apaga el bot por completo en un grupo específico (nadie más
// que admin/owner puede volver a encenderlo). Inspirado en
// commands/grupos/botgrupo.js de fsociety-bot.

const fs = require('fs')
const path = require('path')
const { escribirJSONAtomico } = require('./escrituraAtomica')

const RUTA_DB = path.join(__dirname, '..', 'data', 'botgrupo.json')

function asegurarArchivo() {
  const carpeta = path.dirname(RUTA_DB)
  if (!fs.existsSync(carpeta)) fs.mkdirSync(carpeta, { recursive: true })
  if (!fs.existsSync(RUTA_DB)) escribirJSONAtomico(RUTA_DB, [])
}

function leerSet() {
  asegurarArchivo()
  try {
    const data = JSON.parse(fs.readFileSync(RUTA_DB, 'utf-8'))
    return new Set(Array.isArray(data) ? data : [])
  } catch {
    return new Set()
  }
}

function guardarSet(set) {
  escribirJSONAtomico(RUTA_DB, [...set])
}

function estaApagado(jidGrupo) {
  return leerSet().has(jidGrupo)
}

function apagar(jidGrupo) {
  const set = leerSet()
  set.add(jidGrupo)
  guardarSet(set)
}

function encender(jidGrupo) {
  const set = leerSet()
  set.delete(jidGrupo)
  guardarSet(set)
}

module.exports = { estaApagado, apagar, encender }