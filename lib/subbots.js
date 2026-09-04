//CÓDIGO ORIGINAL DE YUIBOT-MD
const fs = require('fs')
const path = require('path')

const CARPETA_SUBBOTS = path.join(__dirname, '..', 'subbots')

function rutaDatos(numeroSubbot) {
  return path.join(CARPETA_SUBBOTS, numeroSubbot, 'datos.json')
}

function leerDatos(numeroSubbot) {
  try {
    const ruta = rutaDatos(numeroSubbot)
    if (!fs.existsSync(ruta)) return null
    return JSON.parse(fs.readFileSync(ruta, 'utf-8'))
  } catch {
    return null
  }
}

function guardarDatos(numeroSubbot, datos) {
  const carpeta = path.join(CARPETA_SUBBOTS, numeroSubbot)
  if (!fs.existsSync(carpeta)) fs.mkdirSync(carpeta, { recursive: true })
  fs.writeFileSync(rutaDatos(numeroSubbot), JSON.stringify(datos, null, 2))
}

function guardarDuenoSubbot(numeroSubbot, dueno) {
  const actual = leerDatos(numeroSubbot) || {}
  guardarDatos(numeroSubbot, { ...actual, dueno })
}

function obtenerDuenoSubbot(numeroSubbot) {
  return leerDatos(numeroSubbot)?.dueno || null
}

function esDuenoDeSubbot(numeroSubbot, numeroRemitente) {
  if (numeroSubbot === numeroRemitente) return true
  const dueno = obtenerDuenoSubbot(numeroSubbot)
  if (!dueno) return false
  return dueno.numero === numeroRemitente
}

function marcarPremium(numeroSubbot, esPremium) {
  const actual = leerDatos(numeroSubbot) || {}
  guardarDatos(numeroSubbot, { ...actual, premium: esPremium })
}

function esPremium(numeroSubbot) {
  return leerDatos(numeroSubbot)?.premium === true
}

function establecerNombrePersonalizado(numeroSubbot, nombre) {
  const actual = leerDatos(numeroSubbot) || {}
  guardarDatos(numeroSubbot, { ...actual, nombrePersonalizado: nombre })
}

function obtenerNombrePersonalizado(numeroSubbot) {
  return leerDatos(numeroSubbot)?.nombrePersonalizado || null
}

function listarSubbots() {
  try {
    if (!fs.existsSync(CARPETA_SUBBOTS)) return []
    return fs.readdirSync(CARPETA_SUBBOTS, { withFileTypes: true })
      .filter((entrada) => entrada.isDirectory())
      .map((entrada) => entrada.name)
  } catch {
    return []
  }
}

module.exports = {
  guardarDuenoSubbot,
  obtenerDuenoSubbot,
  esDuenoDeSubbot,
  marcarPremium,
  esPremium,
  establecerNombrePersonalizado,
  obtenerNombrePersonalizado,
  listarSubbots,
}