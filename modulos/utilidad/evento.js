// .evento Nombre | fecha hora | descripción opcional
// Fechas: 25/12 20:00 · 25/12/2026 20:00 · hoy 18:30 · mañana 9:00   (hora de Perú, UTC-5)
const { interpretarFecha } = require('../../lib/fechas')

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
