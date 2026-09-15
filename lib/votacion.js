//CÓDIGO ORIGINAL DE YUIBOT-MD
// Votaciones/encuestas por grupo: un admin crea una con pregunta y
// opciones, los miembros votan por número de opción, y se puede ver el
// resultado en cualquier momento o cerrarla.

const fs = require('fs')
const path = require('path')
const { escribirJSONAtomico } = require('./escrituraAtomica')

const RUTA_DB = path.join(__dirname, '..', 'data', 'votacion.json')

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

function crear(jidGrupo, { pregunta, opciones, creadoPor }) {
  const data = leer()
  data[jidGrupo] = { activa: true, pregunta, opciones, creadoPor, votos: {} }
  guardar(data)
  return data[jidGrupo]
}

function votar(jidGrupo, numero, indiceOpcion) {
  const data = leer()
  const votacion = data[jidGrupo]
  if (!votacion || !votacion.activa) return { ok: false, motivo: 'sin_votacion' }
  if (indiceOpcion < 0 || indiceOpcion >= votacion.opciones.length) return { ok: false, motivo: 'opcion_invalida' }

  votacion.votos[numero] = indiceOpcion
  guardar(data)
  return { ok: true }
}

function contarVotos(votacion) {
  const conteo = votacion.opciones.map(() => 0)
  for (const indice of Object.values(votacion.votos || {})) {
    if (conteo[indice] !== undefined) conteo[indice] += 1
  }
  return conteo
}

function cerrar(jidGrupo) {
  const data = leer()
  const votacion = data[jidGrupo]
  if (!votacion) return null

  const conteo = contarVotos(votacion)
  delete data[jidGrupo]
  guardar(data)

  return { pregunta: votacion.pregunta, opciones: votacion.opciones, conteo, totalVotos: Object.keys(votacion.votos || {}).length }
}

function cancelar(jidGrupo) {
  const data = leer()
  delete data[jidGrupo]
  guardar(data)
}

module.exports = { obtener, crear, votar, contarVotos, cerrar, cancelar }