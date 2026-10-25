// .evento Nombre | fecha hora | descripción opcional
// Fechas: 25/12 20:00 · 25/12/2026 20:00 · hoy 18:30 · mañana 9:00   (hora de Perú, UTC-5)
const OFFSET_HORAS = 5 // Lima = UTC-5, sin horario de verano

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

function interpretar(args, ahora = new Date()) {
  const [nombre, fechaTexto, ...descripcion] = args.join(' ').split('|').map((p) => p.trim())
  if (!nombre) return { error: 'Falta el nombre del evento.' }
  if (nombre.length > 100) return { error: 'El nombre es muy largo (máx. 100 caracteres).' }
  if (!fechaTexto) return { error: 'Falta la fecha y hora.' }
  const fecha = interpretarFecha(fechaTexto, ahora)
  if (!fecha) return { error: `No entendí la fecha "${fechaTexto}".` }
  if (fecha.getTime() < ahora.getTime() - 60000) return { error: 'Esa fecha ya pasó.' }
  return { nombre, fecha, descripcion: descripcion.join(' | ').trim() || undefined }
}

module.exports = {
  name: 'evento',
  aliases: ['event', 'quedada'],
  description: 'Crea un evento de WhatsApp: .evento Cumpleaños | 25/12 20:00 | En mi casa',
  category: 'utilidad',

  async execute(sock, msg, args, { config }) {
    const jid = msg.key.remoteJid
    const prefijo = config.PREFIXES[0]
    const datos = interpretar(args)

    if (datos.error) {
      return sock.sendMessage(jid, {
        text:
          `❌ ${datos.error}\n\n📌 Ejemplos:\n${prefijo}evento Reunión | mañana 20:00\n${prefijo}evento Cumpleaños | 25/12 19:30 | En mi casa\n\n` +
          `🕐 Hora de Perú. También sirve: hoy 18:30 · 25/12/2026 20:00`,
      }, { quoted: msg })
    }

    await sock.sendMessage(jid, {
      event: { name: datos.nombre, description: datos.descripcion, startDate: datos.fecha, extraGuestsAllowed: true },
    }, { quoted: msg })
  },

  _internos: { interpretarFecha, interpretar },
}
