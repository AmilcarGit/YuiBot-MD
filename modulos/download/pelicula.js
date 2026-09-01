//CÓDIGO ORIGINAL DE YUIBOT-MD
const { APIS } = require('../../defaults')

const API_URL = 'https://dv-yer-api.online/movies'
const LIMITE = 10

function extraerLinkDescarga(json) {
  return (
    json?.url ||
    json?.download_url ||
    json?.download ||
    json?.link ||
    json?.data?.url ||
    json?.data?.download_url ||
    json?.result?.url ||
    null
  )
}

module.exports = {
  name: 'pelicula',
  aliases: ['movie', 'peli'],
  description: 'Busca películas y series para descargar',
  category: 'download',

  async execute(sock, msg, args, { config }) {
    const jid = msg.key.remoteJid
    const prefijo = config.PREFIXES[0]
    const query = args.join(' ').trim()

    if (!query) {
      return sock.sendMessage(
        jid,
        { text: `❌ Escribe qué película o serie quieres buscar.\n📌 Ejemplo: ${prefijo}pelicula Dragon Ball Z` },
        { quoted: msg }
      )
    }

    try {
      const url = `${API_URL}?q=${encodeURIComponent(query)}&limit=${LIMITE}&apikey=${encodeURIComponent(APIS.DVYER_KEY)}`
      const resp = await fetch(url)
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`)

      const data = await resp.json()

      if (!data?.ok || !Array.isArray(data?.results) || data.results.length === 0) {
        throw new Error(data?.message || `No se encontraron resultados para "${query}"`)
      }

      const resultados = data.results
      const restantes = data.quota?.remaining_today

      let texto = `⛧───「 Resultados: ${query} 」───⛧\n\n`
      resultados.forEach((item, index) => {
        texto += `${index + 1}. *${item.title}*\n`
        texto += `   ❖ tipo: ${item.type === 'movie' ? 'Película' : 'Serie'}\n`
        texto += `   ❖ año: ${item.year || 'Desconocido'}\n\n`
      })
      if (restantes !== undefined) {
        texto += `⚠️ _Búsquedas restantes hoy: ${restantes}/${data.quota.limit_per_day}_\n`
      }
      texto += `╰─➤ _Responde con el número (1-${resultados.length}) para obtener el link de descarga_ 🥀`

      await sock.sendMessage(jid, { text: texto }, { quoted: msg })

      const respuesta = await new Promise((resolve) => {
        const escuchar = (upsert) => {
          const nuevoMsg = upsert.messages?.[0]
          if (!nuevoMsg?.message) return
          const remitenteNuevo = nuevoMsg.key.participantAlt || nuevoMsg.key.participant || nuevoMsg.key.remoteJid
          const remitenteOriginal = msg.key.participantAlt || msg.key.participant || msg.key.remoteJid
          if (nuevoMsg.key.remoteJid !== jid || remitenteNuevo !== remitenteOriginal) return

          const texto = nuevoMsg.message.conversation || nuevoMsg.message.extendedTextMessage?.text || ''
          const numero = parseInt(texto.trim(), 10)
          if (numero >= 1 && numero <= resultados.length) {
            sock.ev.off('messages.upsert', escuchar)
            resolve(numero)
          }
        }
        sock.ev.on('messages.upsert', escuchar)
        setTimeout(() => {
          sock.ev.off('messages.upsert', escuchar)
          resolve(null)
        }, 60000)
      })

      if (!respuesta) return

      const elegida = resultados[respuesta - 1]

      await sock.sendMessage(jid, { text: `⏳ Obteniendo link de descarga de "${elegida.title}"...` }, { quoted: msg })

      const respLink = await fetch(elegida.mediafire_url)
      if (!respLink.ok) throw new Error(`No se pudo obtener el link (HTTP ${respLink.status})`)

      const dataLink = await respLink.json()
      const linkDescarga = extraerLinkDescarga(dataLink)

      if (linkDescarga) {
        await sock.sendMessage(
          jid,
          { text: `⛧───「 ${elegida.title} 」───⛧\n\n🔗 ${linkDescarga}\n\n╰─➤ _${config.BOT_NAME}_ 🥀` },
          { quoted: msg }
        )
      } else {
        await sock.sendMessage(
          jid,
          {
            text:
              `⚠️ No reconocí el formato del link, aquí está la respuesta completa de la API:\n\n` +
              '```' + JSON.stringify(dataLink, null, 2).slice(0, 1500) + '```'
          },
          { quoted: msg }
        )
      }
    } catch (error) {
      console.error('[PELICULA]', error)
      await sock.sendMessage(
        jid,
        { text: `❌ No se pudo buscar o descargar.\n\n> ${error.message || 'Error desconocido'}` },
        { quoted: msg }
      )
    }
  },
}