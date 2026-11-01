// Misiones diarias: 3 por persona y por día (fácil · media · difícil). Se reinician a medianoche (hora de Perú).
// Reclamarlas da monedas; completar las 3 da un bono extra que crece con la racha de días seguidos.
const path = require('path')
const crypto = require('crypto')
const { crearAlmacenCacheado } = require('./escrituraAtomica')
const { agregarMonedasConBoost, obtenerUsuario } = require('./db')

const almacen = crearAlmacenCacheado(path.join(__dirname, '..', 'data', 'misiones.json'), () => ({ usuarios: {} }))

const POOL = {
  facil: [
    { id: 'daily', icono: '🎁', texto: 'Reclama tu recompensa diaria', evento: 'daily', meta: 1, premio: 100 },
    { id: 'chat5', icono: '💬', texto: 'Chatea en un grupo y gana XP 5 veces', evento: 'chat', meta: 5, premio: 120 },
    { id: 'trabajo3', icono: '🧰', texto: 'Haz 3 trabajos', evento: 'trabajo', meta: 3, premio: 150 },
  ],
  media: [
    { id: 'trabajo5', icono: '⛏️', texto: 'Haz 5 trabajos', evento: 'trabajo', meta: 5, premio: 220 },
    { id: 'ganar600', icono: '💰', texto: 'Gana 600 monedas trabajando', evento: 'ganado', meta: 600, premio: 250 },
    { id: 'granja', icono: '🌾', texto: 'Cosecha tu granja', evento: 'granja', meta: 1, premio: 200 },
  ],
  dificil: [
    { id: 'trabajo9', icono: '🏗️', texto: 'Haz 9 trabajos', evento: 'trabajo', meta: 9, premio: 380 },
    { id: 'ganar2500', icono: '🤑', texto: 'Gana 2.500 monedas trabajando', evento: 'ganado', meta: 2500, premio: 450 },
    { id: 'mejora', icono: '🛠️', texto: 'Compra una mejora (.upgrades)', evento: 'mejora', meta: 1, premio: 400 },
  ],
}
const BONO_BASE = 300
const BONO_POR_DIA = 50
const BONO_TOPE_DIAS = 10

/** Día en hora de Perú (UTC-5), formato YYYY-MM-DD. */
const diaDe = (ahora = Date.now()) => new Date(ahora - 5 * 3600000).toISOString().slice(0, 10)
const diaAnterior = (dia) => new Date(Date.parse(`${dia}T00:00:00Z`) - 86400000).toISOString().slice(0, 10)

/** Las 3 misiones del día para esa persona (siempre las mismas durante el día). */
function misionesDe(numero, dia = diaDe()) {
  return ['facil', 'media', 'dificil'].map((nivel) => {
    const lista = POOL[nivel]
    const h = crypto.createHash('sha256').update(`${numero}|${dia}|${nivel}`).digest()
    return { ...lista[h.readUInt32BE(0) % lista.length], nivel }
  })
}

function ficha(datos, numero, dia) {
  datos.usuarios = datos.usuarios || {}
  let f = datos.usuarios[numero]
  if (!f) f = datos.usuarios[numero] = { dia, progreso: {}, reclamadas: [], bono: false, racha: 0, ultimoBono: '' }
  if (f.dia !== dia) { f.dia = dia; f.progreso = {}; f.reclamadas = []; f.bono = false }
  return f
}

/** Suma avance de un evento. Nunca debe romper la acción que lo origina. */
function avanzar(numero, evento, cantidad = 1, ahora = Date.now()) {
  try {
    const n = Math.floor(Number(cantidad))
    if (!numero || !(n > 0)) return
    const dia = diaDe(ahora)
    const mis = misionesDe(numero, dia).filter((m) => m.evento === evento)
    if (!mis.length) return
    const datos = almacen.leer(); const f = ficha(datos, numero, dia)
    for (const m of mis) f.progreso[m.id] = Math.min(m.meta, (f.progreso[m.id] || 0) + n)
    almacen.guardar(datos)
  } catch { /* las misiones nunca rompen nada */ }
}

function estado(numero, ahora = Date.now()) {
  const dia = diaDe(ahora)
  const datos = almacen.leer(); const f = ficha(datos, numero, dia)
  const lista = misionesDe(numero, dia).map((m) => {
    const actual = Math.min(m.meta, f.progreso[m.id] || 0)
    return { ...m, actual, completa: actual >= m.meta, reclamada: f.reclamadas.includes(m.id) }
  })
  const rachaVigente = f.ultimoBono === dia || f.ultimoBono === diaAnterior(dia) ? f.racha : 0
  return { dia, misiones: lista, bonoReclamado: f.bono, racha: rachaVigente, bonoPotencial: BONO_BASE + Math.min(rachaVigente + (f.ultimoBono === dia ? 0 : 1), BONO_TOPE_DIAS) * BONO_POR_DIA }
}

/** Cobra todo lo completado y aún no reclamado. */
function reclamar(numero, ahora = Date.now()) {
  const dia = diaDe(ahora)
  const datos = almacen.leer(); const f = ficha(datos, numero, dia)
  const lista = misionesDe(numero, dia)
  const nuevas = lista.filter((m) => (f.progreso[m.id] || 0) >= m.meta && !f.reclamadas.includes(m.id))
  let bono = 0
  const todas = lista.every((m) => (f.progreso[m.id] || 0) >= m.meta)
  if (!f.bono && todas && nuevas.length + f.reclamadas.length === lista.length) {
    f.racha = f.ultimoBono === diaAnterior(dia) ? f.racha + 1 : 1
    f.ultimoBono = dia; f.bono = true
    bono = BONO_BASE + Math.min(f.racha, BONO_TOPE_DIAS) * BONO_POR_DIA
  }
  if (!nuevas.length && !bono) return { ok: false, motivo: lista.every((m) => f.reclamadas.includes(m.id)) ? 'todo' : 'nada' }
  for (const m of nuevas) f.reclamadas.push(m.id)
  almacen.guardar(datos)
  const base = nuevas.reduce((t, m) => t + m.premio, 0)
  const total = base + bono
  const antes = obtenerUsuario(numero)?.monedas || 0
  const saldo = agregarMonedasConBoost(numero, total)
  return { ok: true, nuevas, base, bono, racha: f.racha, ganado: saldo - antes, saldo }
}

module.exports = { POOL, BONO_BASE, BONO_POR_DIA, diaDe, misionesDe, avanzar, estado, reclamar }
