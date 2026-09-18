//CÓDIGO ORIGINAL DE YUIBOT-MD
// Modo mantenimiento GLOBAL: cuando está activo, el bot ignora comandos
// de todos menos del owner, y responde (con cooldown) el mensaje
// configurado. Distinto de lib/mantenimiento.js, que es la limpieza
// automática de sesión/backups — este es un interruptor manual.

const fs = require('fs')
const path = require('path')
const { escribirJSONAtomico } = require('./escrituraAtomica')

const RUTA_DB = path.join(__dirname, '..', 'data', 'modo-mantenimiento.json')
const MENSAJE_DEFECTO = '🛠️ El bot está en mantenimiento. Vuelve en un rato.'

function asegurarArchivo() {
  const carpeta = path.dirname(RUTA_DB)
  if (!fs.existsSync(carpeta)) fs.mkdirSync(carpeta, { recursive: true })
  if (!fs.existsSync(RUTA_DB)) escribirJSONAtomico(RUTA_DB, { enabled: false, mensaje: MENSAJE_DEFECTO })
}

function leer() {
  asegurarArchivo()
  try {
    const data = JSON.parse(fs.readFileSync(RUTA_DB, 'utf-8'))
    return { enabled: Boolean(data?.enabled), mensaje: data?.mensaje || MENSAJE_DEFECTO }
  } catch {
    return { enabled: false, mensaje: MENSAJE_DEFECTO }
  }
}

function guardar(data) {
  escribirJSONAtomico(RUTA_DB, data)
}

function estaActivo() {
  return leer().enabled
}

function obtenerMensaje() {
  return leer().mensaje
}

function activar(mensaje) {
  guardar({ enabled: true, mensaje: mensaje && mensaje.trim() ? mensaje.trim() : MENSAJE_DEFECTO })
}

function desactivar() {
  const actual = leer()
  guardar({ ...actual, enabled: false })
}

module.exports = { estaActivo, obtenerMensaje, activar, desactivar, MENSAJE_DEFECTO }