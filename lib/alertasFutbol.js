// Alertas automáticas de fútbol: quien "sigue" a un equipo recibe en su chat
// el inicio, los goles, el descanso, las rojas y el final del partido.
// Cada seguimiento pertenece a un bot (principal o subbot) y solo ese bot lo
// vigila, así no llegan avisos duplicados.
const path = require('path')
const { crearAlmacenCacheado } = require('./escrituraAtomica')
const futbol = require('./futbol')

const RUTA = path.join(__dirname, '..', 'data', 'futbol.json')
const almacen = crearAlmacenCacheado(RUTA, () => ({ siguiente: 1, seguidos: [], estados: {} }))
const MAX_POR_CHAT = 5
const INTERVALO_MS = 60000
const DIA_MS = 86400000

function leer() {
  const d = almacen.leer()
  if (!Array.isArray(d.seguidos)) d.seguidos = []
  if (!d.estados || typeof d.estados !== 'object') d.estados = {}
  d.siguiente = d.siguiente || 1
  return d
}

function seguir({ idBot, jid, numero, nombre, claves }) {
  const d = leer()
  const clave = futbol.sinAcentos(nombre)
  if (d.seguidos.some((s) => s.idBot === idBot && s.jid === jid && s.clave === clave)) return { ok: false, motivo: 'repetido' }
  if (d.seguidos.filter((s) => s.jid === jid).length >= MAX_POR_CHAT) return { ok: false, motivo: 'limite' }
  const s = { id: d.siguiente++, idBot, jid, numero, nombre, clave, claves, creado: Date.now() }
  d.seguidos.push(s)
  almacen.guardar(d)
  return { ok: true, seguimiento: s }
}

function dejar(jid, texto) {
  const d = leer()
  const t = futbol.sinAcentos(texto)
  const quitados = d.seguidos.filter((s) => s.jid === jid && (s.clave.includes(t) || t.includes(s.clave)))
  if (!t || !quitados.length) return []
  d.seguidos = d.seguidos.filter((s) => !quitados.includes(s))
  almacen.guardar(d)
  return quitados
}

const listarDe = (jid) => leer().seguidos.filter((s) => s.jid === jid)

/** Compara el estado guardado con el actual y devuelve los avisos a enviar. */
function detectarEventos(previo, p) {
  const actual = { estado: p.estado, gl: p.local.goles ?? 0, gv: p.visita.goles ?? 0, rojas: p.rojas.length }
  if (!previo) return { actual, eventos: [] } // primera vez que lo vemos: solo se registra
  const eventos = []
  if (previo.estado === 'pre' && (p.estado === 'vivo' || p.estado === 'descanso')) eventos.push({ tipo: 'inicio' })
  if (actual.gl < previo.gl || actual.gv < previo.gv) eventos.push({ tipo: 'anulado' })
  else {
    const nuevos = (actual.gl - previo.gl) + (actual.gv - previo.gv)
    if (nuevos > 0) {
      const ultimos = p.goles.slice(-nuevos)
      const lado = actual.gl > previo.gl ? 'local' : 'visita'
      eventos.push({ tipo: 'gol', lado, gol: ultimos[ultimos.length - 1] || null })
    }
  }
  if (actual.rojas > previo.rojas) eventos.push({ tipo: 'roja', roja: p.rojas[p.rojas.length - 1] || null })
  if (p.estado === 'descanso' && previo.estado !== 'descanso') eventos.push({ tipo: 'descanso' })
  if (p.estado === 'final' && previo.estado !== 'final') eventos.push({ tipo: 'final' })
  return { actual, eventos }
}

function textoEvento(ev, p) {
  const marcador = `${p.local.nombre} *${p.local.goles ?? 0} - ${p.visita.goles ?? 0}* ${p.visita.nombre}`
  switch (ev.tipo) {
    case 'inicio': return `🟢 *¡Comenzó el partido!*\n${p.local.nombre} vs ${p.visita.nombre}\n🏆 ${p.liga}`
    case 'gol': {
      const equipo = ev.lado === 'local' ? p.local.nombre : p.visita.nombre
      const g = ev.gol
      return `⚽ *¡GOOOL de ${equipo}!*${g ? `\n👤 ${g.jugador || 'Gol'}${g.penal ? ' (penal)' : ''}${g.autogol ? ' (en contra)' : ''} ${g.min}` : ''}\n📊 ${marcador}`
    }
    case 'anulado': return `🔄 *Gol anulado (VAR)*\n📊 ${marcador}`
    case 'roja': return `🟥 *¡Tarjeta roja!*${ev.roja ? `\n👤 ${ev.roja.jugador || 'Jugador'} ${ev.roja.min}` : ''}\n📊 ${marcador}`
    case 'descanso': return `⏸️ *Medio tiempo*\n📊 ${marcador}`
    case 'final': return `🏁 *Final del partido*\n📊 ${marcador}\n🏆 ${p.liga}`
    default: return marcador
  }
}

/** Revisa los partidos de los equipos seguidos por este bot y avisa los cambios. */
async function procesar(sock, idBot, ahora = Date.now()) {
  const d = leer()
  const mios = d.seguidos.filter((s) => s.idBot === idBot)
  if (!mios.length) return 0
  const claves = [...new Set(mios.flatMap((s) => s.claves || []))]
  const grupos = await futbol.variasLigas(claves, (c) => futbol.obtenerPartidos(c, { desde: ahora - DIA_MS, hasta: ahora + DIA_MS }))

  let enviados = 0
  for (const g of grupos) {
    for (const p of g.partidos) {
      const suscritos = mios.filter((s) => futbol.partidoDe(p, s.clave))
      if (!suscritos.length) continue
      const llave = `${idBot}:${p.id}`
      const { actual, eventos } = detectarEventos(d.estados[llave], p)
      d.estados[llave] = { ...actual, visto: ahora }
      for (const ev of eventos) {
        for (const jid of new Set(suscritos.map((s) => s.jid))) {
          try {
            await sock.sendMessage(jid, { text: textoEvento(ev, p) })
            enviados += 1
          } catch (error) {
            console.error('[FUTBOL] No se pudo enviar el aviso:', error.message)
          }
        }
      }
    }
  }
  // Limpia estados de partidos que ya no se ven hace más de 2 días
  for (const [k, v] of Object.entries(d.estados)) if (ahora - (v.visto || 0) > 2 * DIA_MS) delete d.estados[k]
  almacen.guardar(d)
  return enviados
}

let temporizador = null
function iniciar(sock, idBot) {
  detener()
  temporizador = setInterval(() => procesar(sock, idBot).catch((e) => console.error('[FUTBOL]', e.message)), INTERVALO_MS)
  if (temporizador.unref) temporizador.unref()
}
function detener() {
  if (temporizador) clearInterval(temporizador)
  temporizador = null
}

module.exports = { seguir, dejar, listarDe, detectarEventos, textoEvento, procesar, iniciar, detener, MAX_POR_CHAT, RUTA }
