//CÓDIGO ORIGINAL DE YUIBOT-MD
// Estadísticas de uso del bot: cuántos mensajes se procesaron, qué
// comandos se usaron y cuántas veces. Alimenta el comando "dashboard".

const fs = require('fs')
const path = require('path')
const { escribirJSONAtomico } = require('./escrituraAtomica')

const RUTA_DB = path.join(__dirname, '..', 'data', 'estadisticas.json')

function asegurarArchivo() {
  const carpeta = path.dirname(RUTA_DB)
  if (!fs.existsSync(carpeta)) fs.mkdirSync(carpeta, { recursive: true })
  if (!fs.existsSync(RUTA_DB)) {
    escribirJSONAtomico(RUTA_DB, { desde: new Date().toISOString(), mensajesTotales: 0, comandos: {} })
  }
}

function leer() {
  asegurarArchivo()
  try {
    const data = JSON.parse(fs.readFileSync(RUTA_DB, 'utf-8'))
    return {
      desde: data?.desde || new Date().toISOString(),
      mensajesTotales: Number(data?.mensajesTotales) || 0,
      comandos: data?.comandos && typeof data.comandos === 'object' ? data.comandos : {},
    }
  } catch {
    return { desde: new Date().toISOString(), mensajesTotales: 0, comandos: {} }
  }
}

function guardar(data) {
  escribirJSONAtomico(RUTA_DB, data)
}

// Se acumulan en memoria y se escriben a disco cada cierta cantidad de
// eventos, para no hacer un escribirJSONAtomico() por CADA mensaje que
// pasa por el bot (eso sí sería un cuello de botella real).
let pendientesMensajes = 0
let pendientesComandos = {}
let ultimoFlush = Date.now()
const INTERVALO_FLUSH_MS = 10 * 1000
const MENSAJES_ANTES_DE_FLUSH = 20

function flush() {
  if (pendientesMensajes === 0 && Object.keys(pendientesComandos).length === 0) return

  const data = leer()
  data.mensajesTotales += pendientesMensajes
  for (const [nombre, cantidad] of Object.entries(pendientesComandos)) {
    data.comandos[nombre] = (data.comandos[nombre] || 0) + cantidad
  }
  guardar(data)

  pendientesMensajes = 0
  pendientesComandos = {}
  ultimoFlush = Date.now()
}

function registrarMensaje() {
  pendientesMensajes += 1
  if (pendientesMensajes >= MENSAJES_ANTES_DE_FLUSH || Date.now() - ultimoFlush >= INTERVALO_FLUSH_MS) flush()
}

function registrarComando(nombre) {
  if (!nombre) return
  pendientesComandos[nombre] = (pendientesComandos[nombre] || 0) + 1
}

function obtenerResumen() {
  flush() // aseguramos que lo pendiente en memoria ya esté contado
  const data = leer()
  const topComandos = Object.entries(data.comandos)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)

  return { desde: data.desde, mensajesTotales: data.mensajesTotales, topComandos, comandosTotales: Object.values(data.comandos).reduce((a, b) => a + b, 0) }
}

module.exports = { registrarMensaje, registrarComando, obtenerResumen }
