//CÓDIGO ORIGINAL DE YUIBOT-MD
const E = require('../../lib/estilo')
const fetch = require('../../lib/http').fetchSeguro // timeout por defecto (ver lib/http.js)
module.exports = {
  name: 'clima',
  aliases: ['weather', 'tiempo'],
  description: 'Muestra el clima actual de una ciudad',
  category: 'utilidad',

  async execute(sock, msg, args, { config }) {
    const jid = msg.key.remoteJid
    const prefijo = config.PREFIXES[0]
    const ciudad = args.join(' ').trim()

    if (!ciudad) {
      return sock.sendMessage(
        jid,
        { text: `❌ Escribe una ciudad.\n📌 Ejemplo: ${prefijo}clima Lima` },
        { quoted: msg }
      )
    }

    try {
      const resp = await fetch(`https://wttr.in/${encodeURIComponent(ciudad)}?format=j1`)
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`)

      const data = await resp.json()
      const actual = data.current_condition?.[0]
      const area = data.nearest_area?.[0]

      if (!actual) throw new Error('No se pudo obtener el clima para esa ciudad')

      const nombreCiudad = area?.areaName?.[0]?.value || ciudad
      const pais = area?.country?.[0]?.value || ''
      const descripcion = actual.lang_es?.[0]?.value || actual.weatherDesc?.[0]?.value || 'Desconocida'

      const texto = E.caja('🌤️', `Clima en ${nombreCiudad}${pais ? `, ${pais}` : ''}`, [
        ['Condición', descripcion, '🌤️'],
        ['Temperatura', `${actual.temp_C}°C (sensación ${actual.FeelsLikeC}°C)`, '🌡️'],
        ['Humedad', `${actual.humidity}%`, '💧'],
        ['Viento', `${actual.windspeedKmph} km/h`, '🌬️'],
        ['Nubosidad', `${actual.cloudcover}%`, '☁️'],
      ], config.BOT_NAME)

      await sock.sendMessage(jid, { text: texto }, { quoted: msg })
    } catch (error) {
      console.error('[CLIMA]', error)
      await sock.sendMessage(
        jid,
        { text: `❌ No se pudo obtener el clima de "${ciudad}".\n\n> ${error.message || 'Error desconocido'}` },
        { quoted: msg }
      )
    }
  },
}