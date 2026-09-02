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

function calcularNivel(xp) {
  return Math.floor(Math.sqrt(xp / 100))
}

function xpParaNivel(nivel) {
  return 100 * nivel * nivel
}

function agregarXpConCooldown(numero, opciones = {}) {
  const { COOLDOWN_MS = 60000, MIN = 5, MAX = 15 } = opciones || {}

  const data = leerTodo()
  const actual = data[numero] || {}
  const ahora = Date.now()

  if (actual.ultimoXp && ahora - actual.ultimoXp < COOLDOWN_MS) {
    return null
  }

  const cantidad = Math.floor(Math.random() * (MAX - MIN + 1)) + MIN
  const xpAnterior = actual.xp || 0
  const nivelAnterior = calcularNivel(xpAnterior)
  const xpNuevo = xpAnterior + cantidad
  const nivelNuevo = calcularNivel(xpNuevo)

  data[numero] = {
    ...actual,
    xp: xpNuevo,
    nivel: nivelNuevo,
    mensajes: (actual.mensajes || 0) + 1,
    ultimoXp: ahora,
    actualizado: ahora,
  }
  guardarTodo(data)

  return {
    xpGanado: cantidad,
    xp: xpNuevo,
    nivel: nivelNuevo,
    subioDeNivel: nivelNuevo > nivelAnterior,
  }
}

module.exports = {
  obtenerUsuario,
  guardarUsuario,
  calcularNivel,
  xpParaNivel,
  agregarXpConCooldown,
}