// Recordatorios persistentes. Cada recordatorio pertenece a un bot (idBot:
// 'principal' o el número del subbot) y solo ese bot lo envía, así no se
// duplican cuando hay varios procesos. Se guardan en data/recordatorios.json.
const path = require('path')
const { crearAlmacenCacheado } = require('./escrituraAtomica')

const RUTA = path.join(__dirname, '..', 'data', 'recordatorios.json')
const almacen = crearAlmacenCacheado(RUTA, () => ({ siguiente: 1, lista: [] }))

const MAX_POR_USUARIO = 20
const INTERVALO_MS = 20000

function leer() {
  const d = almacen.leer()
  if (!d || !Array.isArray(d.lista)) return { siguiente: 1, lista: [] }
  return d
}

function crear({ idBot, jid, numero, texto, cuando, botones }) {
  const d = leer()
  if (d.lista.filter((r) => r.numero === numero).length >= MAX_POR_USUARIO) {
    throw new Error(`Máximo ${MAX_POR_USUARIO} recordatorios por persona.`)
  }
  const r = { id: d.siguiente, idBot, jid, numero, texto: String(texto).slice(0, 500), cuando, creado: Date.now(), ...(Array.isArray(botones) && botones.length ? { botones: botones.slice(0, 3).map((b) => ({ text: String(b.text).slice(0, 25), id: String(b.id).slice(0, 200) })) } : {}) }
  d.siguiente += 1
  d.lista.push(r)
  almacen.guardar(d)
  return r
}

function listarDe(numero) {
  return leer().lista.filter((r) => r.numero === numero).sort((a, b) => a.cuando - b.cuando)
}

function borrar(numero, id) {
  const d = leer()
  const antes = d.lista.length
  d.lista = d.lista.filter((r) => !(r.id === id && r.numero === numero))
  if (d.lista.length === antes) return false
  almacen.guardar(d)
  return true
}

function vencidos(idBot, ahora = Date.now()) {
  return leer().lista.filter((r) => r.idBot === idBot && r.cuando <= ahora)
}

function quitarPorId(ids) {
  if (!ids.length) return
  const d = leer()
  d.lista = d.lista.filter((r) => !ids.includes(r.id))
  almacen.guardar(d)
}

async function procesar(sock, idBot, ahora = Date.now()) {
  const debidos = vencidos(idBot, ahora)
  const hechos = []
  for (const r of debidos) {
    try {
      const contenido = { text: `⏰ *Recordatorio* para @${r.numero}\n\n${r.texto}`, mentions: [`${r.numero}@s.whatsapp.net`] }
      try {
        await sock.sendMessage(r.jid, r.botones ? { ...contenido, buttons: r.botones } : contenido)
      } catch (error) {
        if (!r.botones) throw error
        await sock.sendMessage(r.jid, contenido) // sin botones si WhatsApp los rechaza
      }
      hechos.push(r.id)
    } catch (error) {
      // Si es muy viejo (más de 1 día) se descarta para no reintentar siempre.
      if (ahora - r.cuando > 86400000) hechos.push(r.id)
      else console.error('[RECORDAR] No se pudo enviar, se reintenta:', error.message)
    }
  }
  quitarPorId(hechos)
  return hechos.length
}

let temporizador = null
function iniciar(sock, idBot) {
  detener()
  temporizador = setInterval(() => {
    procesar(sock, idBot).catch((e) => console.error('[RECORDAR]', e.message))
  }, INTERVALO_MS)
  if (temporizador.unref) temporizador.unref()
}

function detener() {
  if (temporizador) clearInterval(temporizador)
  temporizador = null
}

module.exports = { crear, listarDe, borrar, vencidos, procesar, iniciar, detener, MAX_POR_USUARIO, RUTA }
