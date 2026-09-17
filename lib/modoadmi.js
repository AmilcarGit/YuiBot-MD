//CÓDIGO ORIGINAL DE YUIBOT-MD
// Modoadmi: cuando está activo, solo admins/owner pueden usar comandos
// en ese grupo (los demás se ignoran en silencio). Inspirado en
// commands/grupos/modoadmi.js de fsociety-bot.

const fs = require('fs')
const path = require('path')
const { escribirJSONAtomico } = require('./escrituraAtomica')

const RUTA_DB = path.join(__dirname, '..', 'data', 'modoadmi.json')

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

function estaActivo(jidGrupo) {
  return leerSet().has(jidGrupo)
}

function activar(jidGrupo) {
  const set = leerSet()
  set.add(jidGrupo)
  guardarSet(set)
}

function desactivar(jidGrupo) {
  const set = leerSet()
  set.delete(jidGrupo)
  guardarSet(set)
}

module.exports = { estaActivo, activar, desactivar }