//CÓDIGO ORIGINAL DE YUIBOT-MD
const { APIS } = require('../../defaults')

const API_URL = 'https://api.lempi.lat/s/ttsmp3'

const VOCES = {
  jorge: 'Jorge (Castilian)',
  carmen: 'Carmen (Castilian)',
  juan: 'Juan (Castilian)',
  leonor: 'Leonor (Castilian)',
  diego: 'Diego (Argentinian)',
  esperanza: 'Esperanza (Mexican)',
  francisca: 'Francisca (Chilean)',
  carlos: 'Carlos (Latin American)',
  soledad: 'Soledad (Latin American)',
  ximena: 'Ximena (Latin American)',
  monica: 'Monica (Castilian)',
  duardo: 'Duardo (Castilian)',
  lola: 'Lola (Castilian)',
  manuel: 'Manuel (Castilian)',
  juanito: 'Juanito (Castilian, boy)',
  florita: 'Florita (Castilian, girl)',
  javier: 'Javier (Mexican)',
  paulina: 'Paulina (Mexican)',
  francisco: 'Francisco (Mexican)',
  gloria: 'Gloria (Mexican)',
  violeta: 'Violeta (Mexican)',
  miguelito: 'Miguelito (Mexican, boy)',
  paquita: 'Paquita (Mexican, girl)',
  conchita: 'Conchita (Spanish, EU)',
  enrique: 'Enrique (Spanish, EU)',
  lucia: 'Lucia (Spanish, EU)',
  mia: 'Mia (Spanish, MX)',
  miguel: 'Miguel (Spanish, US)',
  penelope: 'Penelope (Spanish, US)',
  lupe: 'Lupe (Spanish, US)',
  joanna: 'Joanna (English, US)',
  matthew: 'Matthew (English, US)',
  amy: 'Amy (English, UK)',
  brian: 'Brian (English, UK)',
}

const VOZ_DEFAULT = 'jorge'

module.exports = {
  name: 'tts',
  aliases: ['voz', 'texttospeech'],
  description: 'Convierte texto a voz',
  category: 'utilidad',

  async execute(sock, msg, args, { config }) {
    const jid = msg.key.remoteJid
    const prefijo = config.PREFIXES[0]

    if (!args.length) {
      return sock.sendMessage(
        jid,
        {
          text:
            `❌ Escribe el texto a convertir.\n\n` +
            `📌 Ejemplo: ${prefijo}tts Hola cómo estás\n` +
            `📌 Con voz específica: ${prefijo}tts esperanza Hola cómo estás\n\n` +
            `_Usa ${prefijo}voces para ver la lista de voces disponibles._`
        },
        { quoted: msg }
      )
    }

    let vozClave = VOZ_DEFAULT
    let texto = args.join(' ')

    const primeraPalabra = args[0].toLowerCase()
    if (VOCES[primeraPalabra]) {
      vozClave = primeraPalabra
      texto = args.slice(1).join(' ')
    }

    if (!texto.trim()) {
      return sock.sendMessage(jid, { text: '❌ Falta el texto después del nombre de la voz.' }, { quoted: msg })
    }

    try {
      const url =
        `${API_URL}?text=${encodeURIComponent(texto)}` +
        `&speaker=${encodeURIComponent(VOCES[vozClave])}` +
        `&apikey=${encodeURIComponent(APIS.LEMPI_KEY)}`

      const resp = await fetch(url)
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`)

      const data = await resp.json()

      if (!data?.status || !data?.datos?.audioUrl) {
        throw new Error(data?.message || data?.error || 'No se pudo generar el audio')
      }

      const respAudio = await fetch(data.datos.audioUrl)
      if (!respAudio.ok) throw new Error(`No se pudo descargar el audio (HTTP ${respAudio.status})`)

      const buffer = Buffer.from(await respAudio.arrayBuffer())

      await sock.sendMessage(
        jid,
        { audio: buffer, mimetype: 'audio/mpeg', ptt: false },
        { quoted: msg }
      )
    } catch (error) {
      console.error('[TTS]', error)
      await sock.sendMessage(
        jid,
        { text: `❌ No se pudo generar el audio.\n\n> ${error.message || 'Error desconocido'}` },
        { quoted: msg }
      )
    }
  },
}