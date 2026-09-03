//CÓDIGO ORIGINAL DE YUIBOT-MD
const fs = require('fs')
const path = require('path')

const RUTA_DB = path.join(__dirname, '..', 'data', 'usuarios.json')
const RUTA_DB_GRUPOS = path.join(__dirname, '..', 'data', 'grupos.json')

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

function asegurarArchivoGrupos() {
  const carpeta = path.dirname(RUTA_DB_GRUPOS)
  if (!fs.existsSync(carpeta)) fs.mkdirSync(carpeta, { recursive: true })
  if (!fs.existsSync(RUTA_DB_GRUPOS)) fs.writeFileSync(RUTA_DB_GRUPOS, '{}')
}

function leerGrupos() {
  asegurarArchivoGrupos()
  try {
    return JSON.parse(fs.readFileSync(RUTA_DB_GRUPOS, 'utf-8'))
  } catch {
    return {}
  }
}

function guardarGrupos(data) {
  asegurarArchivoGrupos()
  fs.writeFileSync(RUTA_DB_GRUPOS, JSON.stringify(data, null, 2))
}

function obtenerGrupo(jid) {
  const data = leerGrupos()
  return data[jid] || null
}

function guardarGrupo(jid, campos) {
  const data = leerGrupos()
  data[jid] = { ...data[jid], ...campos, actualizado: Date.now() }
  guardarGrupos(data)
  return data[jid]
}

function calcularNivel(xp) {
  return Math.floor(Math.sqrt(xp / 100))
}

function xpParaNivel(nivel) {
  return 100 * nivel * nivel
}

function obtenerMultiplicador(numero, tipo) {
  const data = leerTodo()
  const actual = data[numero] || {}
  const campo = tipo === 'xp' ? 'boostXp' : 'boostMonedas'
  const boost = actual[campo]
  if (boost && boost.expira > Date.now()) return boost.multiplicador
  return 1
}

function tieneProteccionAntiflood(numero) {
  const data = leerTodo()
  const actual = data[numero] || {}
  return !!(actual.protegidoAntifloodHasta && actual.protegidoAntifloodHasta > Date.now())
}

function agregarXpConCooldown(numero, opciones = {}) {
  const { COOLDOWN_MS = 60000, MIN = 5, MAX = 15 } = opciones || {}

  const data = leerTodo()
  const actual = data[numero] || {}
  const ahora = Date.now()

  if (actual.ultimoXp && ahora - actual.ultimoXp < COOLDOWN_MS) {
    return null
  }

  const multiplicador = obtenerMultiplicador(numero, 'xp')
  const base = Math.floor(Math.random() * (MAX - MIN + 1)) + MIN
  const cantidad = Math.round(base * multiplicador)
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

function agregarMonedas(numero, cantidad) {
  const data = leerTodo()
  const actual = data[numero] || {}
  const balanceAnterior = actual.monedas || 0
  const balanceNuevo = Math.max(0, balanceAnterior + cantidad)

  data[numero] = { ...actual, monedas: balanceNuevo, actualizado: Date.now() }
  guardarTodo(data)

  return balanceNuevo
}

function agregarMonedasConBoost(numero, cantidadBase) {
  const multiplicador = obtenerMultiplicador(numero, 'monedas')
  return agregarMonedas(numero, Math.round(cantidadBase * multiplicador))
}

function reclamarDaily(numero, opciones = {}) {
  const { COOLDOWN_MS = 24 * 60 * 60 * 1000, MIN = 100, MAX = 300 } = opciones || {}

  const data = leerTodo()
  const actual = data[numero] || {}
  const ahora = Date.now()

  if (actual.ultimoDaily && ahora - actual.ultimoDaily < COOLDOWN_MS) {
    return { exito: false, restanteMs: COOLDOWN_MS - (ahora - actual.ultimoDaily) }
  }

  const multiplicador = obtenerMultiplicador(numero, 'monedas')
  const base = Math.floor(Math.random() * (MAX - MIN + 1)) + MIN
  const ganado = Math.round(base * multiplicador)
  const balanceNuevo = (actual.monedas || 0) + ganado

  data[numero] = { ...actual, monedas: balanceNuevo, ultimoDaily: ahora, actualizado: ahora }
  guardarTodo(data)

  return { exito: true, ganado, monedas: balanceNuevo }
}

function comprarItem(numero, item) {
  const data = leerTodo()
  const actual = data[numero] || {}
  const balance = actual.monedas || 0

  if (balance < item.precio) {
    return { exito: false, motivo: 'saldo' }
  }

  const ahora = Date.now()
  let nuevoBalance = balance - item.precio
  const cambios = {}

  if (item.tipo === 'insignia' || item.tipo === 'color' || item.tipo === 'titulo') {
    const inventario = actual.inventario || []
    if (inventario.includes(item.id)) {
      return { exito: false, motivo: 'ya_tiene' }
    }
    cambios.inventario = [...inventario, item.id]
  }

  if (item.tipo === 'boost') {
    const campo = item.valor.tipo === 'xp' ? 'boostXp' : 'boostMonedas'
    cambios[campo] = { multiplicador: item.valor.multiplicador, expira: ahora + item.valor.duracionMs }
  }

  if (item.tipo === 'proteccion') {
    cambios.protegidoAntifloodHasta = ahora + item.valor.duracionMs
  }

  let ganado = 0
  if (item.tipo === 'cofre') {
    ganado = Math.floor(Math.random() * (item.valor.max - item.valor.min + 1)) + item.valor.min
    nuevoBalance += ganado
  }

  data[numero] = { ...actual, ...cambios, monedas: nuevoBalance, actualizado: ahora }
  guardarTodo(data)

  return { exito: true, ganado }
}

function equiparItem(numero, item) {
  const data = leerTodo()
  const actual = data[numero] || {}
  const inventario = actual.inventario || []

  if (!inventario.includes(item.id)) {
    return { exito: false, motivo: 'no_tiene' }
  }

  const campo = item.tipo === 'insignia' ? 'insigniaEquipada' : item.tipo === 'color' ? 'colorEquipado' : 'tituloEquipado'
  data[numero] = { ...actual, [campo]: item.id, actualizado: Date.now() }
  guardarTodo(data)

  return { exito: true }
}

module.exports = {
  obtenerUsuar