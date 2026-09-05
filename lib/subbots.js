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

function normalizarNumero(valor) {
  if (!valor) return null
  const texto = String(valor)
  const numero = texto.split('@')[0].split(':')[0].replace(/\D/g, '')
  return numero || null
}

function guardarDuenoSubbot(numeroSubbot, dueno) {
  const actual = leerDatos(numeroSubbot) || {}
  const numeroDueno = normalizarNumero(dueno?.numero)
  guardarDatos(numeroSubbot, { ...actual, dueno: { ...dueno, numero: numeroDueno } })
}

function obtenerDuenoSubbot(numeroSubbot) {
  return leerDatos(numeroSubbot)?.dueno || null
}

function esDuenoDeSubbot(numeroSubbot, numeroRemitente) {
  const candidatos = Array.isArray(numeroRemitente) ? numeroRemitente : [numeroRemitente]
  const candidatosNormalizados = candidatos
    .map(normalizarNumero)
    .filter(Boolean)

  const numeroSubbotNormalizado = normalizarNumero(numeroSubbot)
  if (numeroSubbotNormalizado && candidatosNormalizados.includes(numeroSubbotNormalizado)) return true

  const dueno = obtenerDuenoSubbot(numeroSubbot)
  const numeroDueno = normalizarNumero(dueno?.numero)
  if (!numeroDueno) return false

  return candidatosNormalizados.includes(numeroDueno)
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
