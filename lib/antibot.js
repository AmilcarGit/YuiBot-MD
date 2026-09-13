//CÓDIGO ORIGINAL DE YUIBOT-MD
// Antibot: detecta bots clon por comportamiento (ejecuta comandos válidos
// muy rápido) + nombre de perfil sospechoso ("bot", "asistente", etc).
// Inspirado en commands/grupos/antibot.js de fsociety-bot.

const fs = require('fs')
const path = require('path')
const { escribirJSONAtomico } = require('./escrituraAtomica')

const RUTA_DB = path.join(__dirname, '..', 'data', 'antibot.json')
const VENTANA_MS = 15 * 1000
const LIMITE = 4
const MAX_STRIKES = 2

function asegurarArchivo() {
  const carpeta = path.dirname(RUTA_DB)
  if (!fs.existsSync(carpeta)) fs.mkdirSync(carpeta, { recursive: true })
  if (!fs.existsSync(RUTA_DB)) escribirJSONAtomico(RUTA_DB, [])
}

function leerGruposActivos() {
  asegurarArchivo()
  try {
    const data = JSON.parse(fs.readFileSync(RUTA_DB, 'utf-8'))
    return new Set(Array.isArray(data) ? data : [])
  } catch {
    return new Set()
  }
}

function guardarGrupos(set) {
  escribirJSONAtomico(RUTA_DB, [...set])
}

function estaActivo(jidGrupo) {
  return leerGruposActivos().has(jidGrupo)
}

function activar(jidGrupo) {
  const set = leerGruposActivos()
  set.add(jidGrupo)
  guardarGrupos(set)
}

function desactivar(jidGrupo) {
  const set = leerGruposActivos()
  set.delete(jidGrupo)
  guardarGrupos(set)
}

function pareceNombreDeBot(nombre) {
  return /(bot|assistant|asistente|robot|autoresponder|^auto$|\bia\b|\bai\b)/i.test(String(nombre || '').trim())
}

// Historial de intentos sospechosos en memoria — no necesita persistirse.
const sospechosos = new Map()

function registrarIntento(jidGrupo, numero) {
  const key = `${jidGrupo}|${numero}`
  const ahora = Date.now()
  const estado = sospechosos.get(key) || { tiempos: [], strikes: 0 }
  estado.tiempos = estado.tiempos.filter((t) => ahora - t <= VENTANA_MS)
  estado.tiempos.push(ahora)

  if (estado.tiempos.length < LIMITE) {
    sospechosos.set(key, estado)
    return { disparado: false }
  }

  estado.strikes += 1
  estado.tiempos = []
  const shouldKick = estado.strikes > MAX_STRIKES

  if (shouldKick) sospechosos.delete(key)
  else sospechosos.set(key, estado)

  return { disparado: true, strikes: estado.strikes, maxStrikes: MAX_STRIKES + 1, shouldKick }
}

module.exports = { estaActivo, activar, desactivar, pareceNombreDeBot, registrarIntento, VENTANA_MS, LIMITE, MAX_STRIKES }