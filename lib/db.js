//CÓDIGO ORIGINAL DE YUIBOT-MD
const fs = require('fs')
const path = require('path')

const RUTA_DB = path.join(__dirname, '..', 'data', 'usuarios.json')

function asegurarArchivo() {
  const carpeta = path.dirname(RUTA_DB)
  if (!fs.existsSync(carpeta)) fs.mkdirSync(carpeta, { recursive: true })
  if (!fs.existsSync(RUTA_DB)) fs.writeFileSync(RUTA_DB, '{}')
}

function leerTodo() {
  asegurarArchivo()
  try {
    return JSON.parse(fs.readFileSync(RUTA_DB, 'utf-8'))
  } catch {
    return {}
  }
}

function guardarTodo(data) {
  asegurarArchivo()
  fs.writeFileSync(RUTA_DB, JSON.stringify(data, null, 2))
}

function obtenerUsuario(numero) {
  const data = leerTodo()
  return data[numero] || null
}

function guardarUsuario(numero, campos) {
  const data = leerTodo()
  data[numero] = { ...data[numero], ...campos, actualizado: Date.now() }
  guardarTodo(data)
  return data[numero]
}

module.exports = { obtenerUsuario, guardarUsuario }