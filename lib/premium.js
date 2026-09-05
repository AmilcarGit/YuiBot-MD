//CÓDIGO ORIGINAL DE YUIBOT-MD
const fs = require('fs')
const path = require('path')
const crypto = require('crypto')

const RUTA_TOKEN = path.join(__dirname, '..', 'data', 'red', 'premium-token.json')

function asegurarCarpeta() {
  const carpeta = path.dirname(RUTA_TOKEN)
  if (!fs.existsSync(carpeta)) fs.mkdirSync(carpeta, { recursive: true })
}

function darToken() {
  asegurarCarpeta()
  const token = crypto.randomBytes(6).toString('hex').toUpperCase()
  fs.writeFileSync(RUTA_TOKEN, JSON.stringify({ token, creado: Date.now() }, null, 2))
  return token
}

function soltarToken() {
  asegurarCarpeta()
  if (fs.existsSync(RUTA_TOKEN)) fs.unlinkSync(RUTA_TOKEN)
}

function obtenerTokenActual() {
  try {
    if (!fs.existsSync(RUTA_TOKEN)) return null
    return JSON.parse(fs.readFileSync(RUTA_TOKEN, 'utf-8')).token
  } catch {
    return null
  }
}

function tokenValido(tokenIngresado) {
  const actual = obtenerTokenActual()
  if (!actual || !tokenIngresado) return false
  return actual.toUpperCase() === tokenIngresado.toUpperCase()
}

function consumirToken(tokenIngresado) {
  if (!tokenValido(tokenIngresado)) return false
  soltarToken()
  return true
}

module.exports = { darToken, soltarToken, obtenerTokenActual, tokenValido, consumirToken }