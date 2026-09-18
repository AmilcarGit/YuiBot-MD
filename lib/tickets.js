//CÓDIGO ORIGINAL DE YUIBOT-MD
const fs = require('fs')
const path = require('path')
const { escribirJSONAtomico } = require('./escrituraAtomica')

const RUTA_DB = path.join(__dirname, '..', 'data', 'tickets.json')

function asegurarArchivo() {
  const carpeta = path.dirname(RUTA_DB)
  if (!fs.existsSync(carpeta)) fs.mkdirSync(carpeta, { recursive: true })
  if (!fs.existsSync(RUTA_DB)) escribirJSONAtomico(RUTA_DB, { siguienteId: 1, tickets: [] })
}

function leer() {
  asegurarArchivo()
  try {
    const data = JSON.parse(fs.readFileSync(RUTA_DB, 'utf-8'))
    return {
      siguienteId: Number(data?.siguienteId) || 1,
      tickets: Array.isArray(data?.tickets) ? data.tickets : [],
    }
  } catch {
    return { siguienteId: 1, tickets: [] }
  }
}

function guardar(data) {
  escribirJSONAtomico(RUTA_DB, data)
}

function crear({ numero, jidOrigen, asunto }) {
  const data = leer()
  const ticket = {
    id: data.siguienteId,
    numero,
    jidOrigen,
    asunto,
    estado: 'abierto',
    creadoEn: new Date().toISOString(),
  }
  data.tickets.push(ticket)
  data.siguienteId += 1
  guardar(data)
  return ticket
}

function listar(estado) {
  const { tickets } = leer()
  return estado ? tickets.filter((t) => t.estado === estado) : tickets
}

function obtener(id) {
  return leer().tickets.find((t) => t.id === Number(id)) || null
}

function cerrar(id) {
  const data = leer()
  const ticket = data.tickets.find((t) => t.id === Number(id))
  if (!ticket) return null
  ticket.estado = 'cerrado'
  ticket.cerradoEn = new Date().toISOString()
  guardar(data)
  return ticket
}

module.exports = { crear, listar, obtener, cerrar }