//CÓDIGO ORIGINAL DE YUIBOT-MD
const { APIS } = require('../../defaults')

const API_URL = 'https://api.lempi.lat/s/youtube'

module.exports = {
name: 'yts',
aliases: ['ytsearch'],
description: 'Busca videos en YouTube',
category: 'download',

async execute(sock, msg, args) {
const jid = msg.key.remoteJid
const query = args.join(' ').trim()

if (!query) {
  return sock.sendMessage(
    jid,
    {
      text:
        `❌ Escribe algo para buscar.\n\n` +
        `📌 Ejemplo:\n` +
        `.yts William Luna`
    },
    { quoted: msg }
  )
}

const keys = [
  APIS.LEMPI_KEY,
  APIS.LEMPI_KEY_2
].filter(key => key && key !== '...' && String(key).trim())

if (keys.length === 0) {
  return sock.sendMessage(
    jid,
    {
      text: '❌ No hay ninguna API de Lempi configurada en defaults.js'
    },
    { quoted: msg }
  )
}

try {
  await sock.sendMessage(
    jid,
    {
      text:
        `🔎 Buscando en YouTube...\n\n` +
        `> ${query}`
    },
    { quoted: msg }
  )

  let data = null
  let ultimoError = null
  let apiUsada = 0

  for (let i = 0; i < keys.length; i++) {
    const apiKey = keys[i]

    try {
      const url =
        `${API_URL}?query=${encodeURIComponent(query)}` +
        `&apikey=${encodeURIComponent(apiKey)}`

      const response = await fetch(url)

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }

      const resultado = await response.json()

      if (
        !resultado ||
        !resultado.status ||
        !resultado.datos ||
        !resultado.datos.results ||
        !Array.isArray(resultado.datos.results.videos)
      ) {
        throw new Error(
          resultado?.message ||
          resultado?.error ||
          'La API no devolvió resultados válidos'
        )
      }

      data = resultado
      apiUsada = i + 1
      break

    } catch (error) {
      ultimoError = error
      console.error(
        `[YTS] API Lempi ${i + 1} falló:`,
        error.message
      )
    }
  }

  if (!data) {
    throw new Error(
      ultimoError?.message ||
      'Las APIs de Lempi no respondieron correctamente'
    )
  }

  const videos = data.datos.results.videos

  if (videos.length === 0) {
    return sock.sendMessage(
      jid,
      {
        text:
          `❌ No encontré resultados para:\n` +
          `> ${query}`
      },
      { quoted: msg }
    )
  }

  const resultados = videos.slice(0, 10)

  let mensaje =
    `╭━━━〔 🔎 YOUTUBE SEARCH 〕━━━╮\n` +
    `┃ 🔍 Búsqueda: ${query}\n` +
    `┃ 📊 Resultados: ${resultados.length}\n` +
    `┃ ⚡ API: Lempi #${apiUsada}\n` +
    `╰━━━━━━━━━━━━━━━━━━━━━━╯\n\n`

  resultados.forEach((video, index) => {
    mensaje +=
      `╭─〔 ${index + 1} 〕──────────\n` +
      `│ 🎬 *${video.title || 'Sin título'}*\n` +
      `│ 👤 Canal: ${video.channel || 'Desconocido'}\n` +
      `│ ⏱️ Duración: ${video.duration || 'Desconocida'}\n` +
      `│ 👁️ Vistas: ${video.views || 'Desconocidas'}\n` +
      `│ 📅 Publicado: ${video.published || 'Desconocido'}\n` +
      `│ 🔗 ${video.url || 'Sin URL'}\n` +
      `╰────────────────────\n\n`
  })

  mensaje +=
    `🤖 Powered by Lempi API`

  await sock.sendMessage(
    jid,
    {
      text: mensaje
    },
    { quoted: msg }
  )

} catch (error) {
  console.error('[YTS]', error)

  await sock.sendMessage(
    jid,
    {
      text:
        `❌ Ocurrió un error al buscar en YouTube.\n\n` +
        `> ${error.message || 'Error desconocido'}`
    },
    { quoted: msg }
  )
}

}
}