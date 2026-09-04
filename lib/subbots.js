//CÓDIGO ORIGINAL DE YUIBOT-MD
const fs = require('fs')
const path = require('path')

function rutaDueno(numeroSubbot) {
  return path.join(__dirname, '..', 'subbots', numeroSubbot, 'dueno.json')
}

function guardarDuenoSubbot(numeroSubbot, dueno) {
  const carpeta = path.join(__dirname, '..', 'subbots', numeroSubbot)
  if (!fs.existsSync(carpeta)) fs.mkdirSync(carpeta, { recursive: true })
  fs.writeFileSync(rutaDueno(numeroSubbot), JSON.stringify(dueno, null, 2))
}

function obtenerDuenoSubbot(numeroSubbot) {
  try {
    const ruta = rutaDueno(numeroSubbot)
    if (!fs.existsSync(ruta)) return null
    return JSON.parse(fs.readFileSync(ruta, 'utf-8'))
  } catch {
    return null
  }
}

function esDuenoDeSubbot(numeroSubbot, numeroRemitente) {
  const dueno = obtenerDuenoSubbot(numeroSubbot)
  if (!dueno) return false
  return dueno.numero === numeroRemitente
}

module.exports = { guardarDuenoSubbot, obtenerDuenoSubbot, esDuenoDeSubbot }