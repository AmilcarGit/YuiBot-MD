//CÓDIGO ORIGINAL DE YUIBOT-MD
// Sorteos por grupo: un admin inicia uno con premio y duración, los
// miembros se unen con "sorteo unirme", y al terminar el tiempo se elige
// un ganador al azar entre los participantes.

const fs = require('fs')
const path = require('path')
const { escribirJSONAtomico } = require('./escrituraAtomica')

const RUTA_DB = path.join(__dirname, '..', 'data', 'sorteo.json')

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

function obtener(jidGrupo) {
  return leer()[jidGrupo] || null
}

function iniciar(jidGrupo, { premio, creadoPor, terminaEn }) {
  const data = leer()
  data[jidGrupo] = { activo: true, premio, creadoPor, terminaEn, participantes: [] }
  guardar(data)
  return data[jidGrupo]
}

function unirse(jidGrupo, numero) {
  const data = leer()
  const sorteo = data[jidGrupo]
  if (!sorteo || !sorteo.activo) return { ok: false, motivo: 'sin_sorteo' }
  if (sorteo.participantes.includes(numero)) return { ok: false, motivo: 'ya_unido' }

  sorteo.participantes.push(numero)
  guardar(data)
  return { ok: true, total: sorteo.participantes.length }
}

function finalizar(jidGrupo) {
  const data = leer()
  const sorteo = data[jidGrupo]
  if (!sorteo) return null

  const participantes = sorteo.participantes || []
  const ganador = participantes.length ? participantes[Math.floor(Math.random() * participantes.length)] : null

  delete data[jidGrupo]
  guardar(data)

  return { premio: sorteo.premio, participantes, ganador }
}

function cancelar(jidGrupo) {
  const data = leer()
  delete data[jidGrupo]
  guardar(data)
}

module.exports = { obtener, iniciar, unirse, finalizar, cancelar }