// Utilidades de fechas en hora de Perú (UTC-5, sin horario de verano).
// Las usan .evento y .recordar.

const OFFSET_HORAS = 5 // Lima = UTC-5

function interpretarFecha(texto, ahora = new Date()) {
  const t = String(texto || '').trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
  const hora = t.match(/(\d{1,2}):(\d{2})\s*$/)
  if (!hora) return null
  const horas = Number(hora[1])
  const minutos = Number(hora[2])
  if (horas > 23 || minutos > 59) return null

  const dia = t.slice(0, hora.index).trim()
  // "Hoy" en Perú: se corre el reloj -5 h y se leen las partes UTC.
  const enPeru = new Date(ahora.getTime() - OFFSET_HORAS * 3600000)
  let anio = enPeru.getUTCFullYear()
  let mes = enPeru.getUTCMonth()
  let diaMes = enPeru.getUTCDate()

  if (dia === 'hoy') {
    // tal cual
  } else if (dia === 'manana') {
    const siguiente = new Date(Date.UTC(anio, mes, diaMes + 1))
    ;[anio, mes, diaMes] = [siguiente.getUTCFullYear(), siguiente.getUTCMonth(), siguiente.getUTCDate()]
  } else {
    const f = dia.match(/^(\d{1,2})[\/-](\d{1,2})(?:[\/-](\d{2,4}))?$/)
    if (!f) return null
    diaMes = Number(f[1])
    mes = Number(f[2]) - 1
    if (f[3]) anio = f[3].length === 2 ? 2000 + Number(f[3]) : Number(f[3])
  }

  const fecha = new Date(Date.UTC(anio, mes, diaMes, horas + OFFSET_HORAS, minutos))
  // Rechaza fechas imposibles como 31/02 (JavaScript las "corrige" en silencio).
  const comprobar = new Date(fecha.getTime() - OFFSET_HORAS * 3600000)
  if (comprobar.getUTCMonth() !== mes || comprobar.getUTCDate() !== diaMes) return null

  // Sin año explícito y ya pasó: se asume el año siguiente.
  if (!/\d{4}|\d{1,2}[\/-]\d{1,2}[\/-]\d{2}/.test(dia) && dia !== 'hoy' && dia !== 'manana' && fecha.getTime() < ahora.getTime()) {
    fecha.setUTCFullYear(fecha.getUTCFullYear() + 1)
  }
  return fecha
}


const UNIDADES_MS = { s: 1000, m: 60000, h: 3600000, d: 86400000 }

/** "30m", "2h", "1h30m", "1d", "90s" → milisegundos (o null si no es una duración). */
function interpretarDuracion(texto) {
  const t = String(texto || '').trim().toLowerCase().replace(/\s+/g, '')
  if (!t || !/^(\d+(?:\.\d+)?[smhd])+$/.test(t)) return null
  let total = 0
  for (const [, cantidad, unidad] of t.matchAll(/(\d+(?:\.\d+)?)([smhd])/g)) total += Number(cantidad) * UNIDADES_MS[unidad]
  return total > 0 ? Math.round(total) : null
}

/** "hace 2 h 5 min" para una duración en milisegundos. */
function describirDuracion(ms) {
  const segundos = Math.max(0, Math.round(ms / 1000))
  if (segundos < 60) return `${segundos} s`
  const d = Math.floor(segundos / 86400)
  const h = Math.floor((segundos % 86400) / 3600)
  const m = Math.floor((segundos % 3600) / 60)
  const partes = []
  if (d) partes.push(`${d} d`)
  if (h) partes.push(`${h} h`)
  if (m && !d) partes.push(`${m} min`)
  return partes.join(' ') || '0 min'
}

/** Fecha legible en hora de Perú: "25/12/2026 20:00". */
function formatearFechaPeru(fecha) {
  const p = new Date(fecha.getTime() - OFFSET_HORAS * 3600000)
  const dos = (n) => String(n).padStart(2, '0')
  return `${dos(p.getUTCDate())}/${dos(p.getUTCMonth() + 1)}/${p.getUTCFullYear()} ${dos(p.getUTCHours())}:${dos(p.getUTCMinutes())}`
}

module.exports = { interpretarFecha, interpretarDuracion, describirDuracion, formatearFechaPeru, OFFSET_HORAS }
