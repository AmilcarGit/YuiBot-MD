// .ubicacion <lat> <lon> [nombre]  ·  o pega un enlace de Google Maps
function extraerCoordenadas(texto) {
  const t = String(texto || '')
  // Enlaces de Google Maps: @-12.04,-77.03 · q=-12.04,-77.03 · ll=...
  const enlace = t.match(/[@=](-?\d{1,3}(?:\.\d+)?),\s*(-?\d{1,3}(?:\.\d+)?)/)
  const simple = t.match(/^\s*(-?\d{1,3}(?:\.\d+)?)\s*[,\s]\s*(-?\d{1,3}(?:\.\d+)?)/)
  const m = enlace || simple
  if (!m) return null
  const latitud = Number(m[1])
  const longitud = Number(m[2])
  if (!(Math.abs(latitud) <= 90 && Math.abs(longitud) <= 180)) return null
  const resto = enlace ? '' : t.slice(m.index + m[0].length).replace(/^[\s,]+/, '').trim()
  return { latitud, longitud, nombre: resto }
}

module.exports = {
  name: 'ubicacion',
  aliases: ['ubicación', 'location', 'mapa'],
  description: 'Envía una ubicación: .ubicacion -12.0464 -77.0428 Lima',
  category: 'utilidad',

  async execute(sock, msg, args, { config }) {
    const jid = msg.key.remoteJid
    const prefijo = config.PREFIXES[0]
    const datos = extraerCoordenadas(args.join(' '))

    if (!datos) {
      return sock.sendMessage(jid, {
        text: `❌ No encontré coordenadas válidas.\n\n📌 Ejemplos:\n${prefijo}ubicacion -12.0464 -77.0428 Plaza Mayor\n${prefijo}ubicacion https://www.google.com/maps/@-12.0464,-77.0428,15z`,
      }, { quoted: msg })
    }

    await sock.sendMessage(jid, {
      location: {
        degreesLatitude: datos.latitud,
        degreesLongitude: datos.longitud,
        ...(datos.nombre ? { name: datos.nombre } : {}),
      },
    }, { quoted: msg })
  },

  _internos: { extraerCoordenadas },
}
