//CÓDIGO ORIGINAL DE YUIBOT-MD
const { APIS } = require('../../defaults')
const { descargarInstagram } = require('../../lib/instagram')

const SEARCH_URL = 'https://orbitcloud.hidenfree.com/api/v1/search/instagramreels'
const LIMITE_RESULTADOS = 10
const LIMITE_VIDEO_MB = 64
const ESPERA_RESPUESTA_MS = 60000

function truncar(texto, max) {
  if (!texto) return 'Sin descripción'
  const limpio = texto.trim()
  return limpio.length > max ? `${limpio.slice(0, max)}...` : limpio
}

module.exports = {
  name: 'instagramreels',
  aliases: ['igreels', 'igsearch'],
  description: 'Busca reels de Instagram por palabra clave y descarga el que elijas',
  category: 'download',

  async execute(sock, msg, args, { config }) {
    const jid = msg.key.remoteJid
    const prefijo = config.PREFIXES[0]
    const query = args.join(' ').trim()

    if (!query) {
      return sock.sendMessage(
        jid,
        { text: `❌ Escribe qué quieres buscar.\n📌 Ejemplo: ${prefijo}instagramreels gatito` },
        { quoted: msg }
      )
    }

    try {
      await sock.sendMessage(jid, { text: `🔎 Buscando reels de Instagram...\n\n> ${query}` }, { quoted: msg })

      const url = `${SEARCH_URL}?apikey=${encodeURIComponent(APIS.ORBIT_KEY)}&query=${encodeURIComponent(query)}`
      const resp = await fetch(url)
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`)

      const data = await resp.json()

      if (!data?.status || !Array.isArray(data?.results) || data.results.length === 0) {
        throw new Error(`No se encontraron reels para "${query}"`)
      }

      const resultados = data.results.slice(0, LIMITE_RESULTADOS)

      let mensaje =
        `╭━━━〔 📸 INSTAGRAM REELS 〕━━━╮\n` +
        `┃ 🔍 Búsqueda: ${query}\n` +
        `┃ 📊 Resultados: ${resultados.length}\n` +
        `╰━━━━━━━━━━━━━━━━━━━━━━╯\n\n`

      resultados.forEach((reel, index) => {
        mensaje +=
          `╭─〔 ${index + 1} 〕──────────\n` +
          `│ 📝 ${truncar(reel.description, 90)}\n` +
          `╰────────────────────\n\n`
      })

      mensaje += `╰─➤ _Responde con el número (1-${resultados.length}) para descargar ese reel_ 🥀\n`
      mensaje += `\n🌐 Resultados vía Orbit API`

      await sock.sendMessage(jid, { text: mensaje }, { quoted: msg })

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
        }, ESPERA_RESPUESTA_MS)
      })

      if (!respuesta) return

      const elegido = resultados[respuesta - 1]
      if (!elegido?.url) {
        return sock.sendMessage(jid, { text: '❌ Ese resultado no tiene un enlace válido.' }, { quoted: msg })
      }

      await sock.sendMessage(jid, { text: `⏳ Descargando reel elegido...\n\n🔗 ${elegido.url}` }, { quoted: msg })

      const datosDescarga = await descargarInstagram(elegido.url)
      const { selected, title, username } = datosDescarga

      const respArchivo = await fetch(selected.download_url)
      if (!respArchivo.ok) throw new Error(`No se pudo descargar el archivo (HTTP ${respArchivo.status})`)

      const buffer = Buffer.from(await respArchivo.arrayBuffer())
      const pesoMB = buffer.length / (1024 * 1024)

      const caption =
        `╭━━━〔 📸 INSTAGRAM 〕━━━╮\n` +
        `┃ 📝 ${title || truncar(elegido.description, 100)}\n` +
        `┃ 👤 @${username || 'desconocido'}\n` +
        `┃ 💾 Tamaño: ${pesoMB.toFixed(1)} MB\n` +
        `╰━━━━━━━━━━━━━━━━━━━━━━╯\n` +
        `🌐 Búsqueda vía Orbit API`

      if (selected.type === 'video') {
        if (pesoMB <= LIMITE_VIDEO_MB) {
          await sock.sendMessage(
            jid,
            { video: buffer, mimetype: 'video/mp4', fileName: selected.filename || 'instagram.mp4', caption },
            { quoted: msg }
          )
        } else {
          await sock.sendMessage(
            jid,
            { document: buffer, mimetype: 'video/mp4', fileName: selected.filename || 'instagram.mp4', caption },
            { quoted: msg }
          )
        }
      } else {
        await sock.sendMessage(jid, { image: buffer, caption }, { quoted: msg })
      }
    } catch (error) {
      console.error('[INSTAGRAMREELS]', error)
      await sock.sendMessage(
        jid,
        { text: `❌ No se pudo buscar o descargar el reel.\n\n> ${error.message || 'Error desconocido'}` },
        { quoted: msg }
      )
    }
  },
}
