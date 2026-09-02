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

if (!keys.length) {
  return sock.sendMessage(
    jid,
    {
      text: '❌ No hay claves de Lempi configuradas en defaults.js'
    },
    { quoted: msg }
  )
}

try {
  await sock.sendMessage(
    jid,
    {
      text:
        `🔎 *Buscando en YouTube...*\n\n` +
        `> ${query}`
    },
    { quoted: msg }
  )

  let data = null
  let apiUsada = 0
  let ultimoError = null

  for (let i = 0; i < keys.length; i++) {
    try {
      const url =
        `${API_URL}?query=${encodeURIComponent(query)}` +
        `&apikey=${encodeURIComponent(keys[i])}`

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
          'Respuesta inválida de Lempi'
        )
      }

      data = resultado
      apiUsada = i + 1

      break
    } catch (error) {
      ultimoError = error

      console.error(
        `[YTS] Lempi API #${i + 1}:`,
        error.message
      )
    }
  }

  if (!data) {
    throw new Error(
      ultimoError?.message ||
      'Las APIs de Lempi no respondieron'
    )
  }

  const videos = data.datos.results.videos

  if (!videos.length) {
    return sock.sendMessage(
      jid,
      {
        text:
          `❌ No encontré resultados para:\n\n` +
          `> ${query}`
      },
      { quoted: msg }
    )
  }

  const resultados = videos.slice(0, 10)
  const primero = resultados[0]

  /*
   * Intentamos encontrar la mejor miniatura disponible.
   * Lempi puede devolver diferentes nombres dependiendo
   * de la versión de la API.
   */
  const thumbnail =
    primero.thumbnail ||
    primero.thumbnailUrl ||
    primero.image ||
    primero.imageUrl ||
    primero.thumb ||
    primero.thumbnails?.[0]?.url ||
    null

  /*
   * PRIMER RESULTADO
   */
  let principal =
    `╭━━━〔 🎬 YOUTUBE 〕━━━╮\n` +
    `┃ 🔎 *${query}*\n` +
    `╰━━━━━━━━━━━━━━━━━━╯\n\n` +
    `🏆 *PRIMER RESULTADO*\n\n` +
    `🎬 *${primero.title || 'Sin título'}*\n` +
    `👤 Canal: ${primero.channel || 'Desconocido'}\n` +
    `⏱️ Duración: ${primero.duration || 'Desconocida'}\n` +
    `👁️ Vistas: ${primero.views || 'Desconocidas'}\n` +
    `📅 Publicado: ${primero.published || 'Desconocido'}\n\n` +
    `🔗 ${primero.url || 'Sin URL'}\n\n` +
    `⚡ Lempi API #${apiUsada}`

  if (thumbnail) {
    try {
      await sock.sendMessage(
        jid,
        {
          image: {
            url: thumbnail
          },
          caption: principal
        },
        { quoted: msg }
      )
    } catch (imageError) {
      console.error(
        '[YTS] Error enviando miniatura:',
        imageError.message
      )

      await sock.sendMessage(
        jid,
        {
          text: principal
        },
        { quoted: msg }
      )
    }
  } else {
    await sock.sendMessage(
      jid,
      {
        text: principal
      },
      { quoted: msg }
    )
  }

  /*
   * RESTO DE RESULTADOS
   */
  if (resultados.length > 1) {
    let lista =
      `╭━━━〔 🔎 MÁS RESULTADOS 〕━━━╮\n` +
      `┃ 📊 ${resultados.length - 1} resultados más\n` +
      `╰━━━━━━━━━━━━━━━━━━━━━━╯\n\n`

    resultados.slice(1).forEach((video, index) => {
      lista +=
        `╭─〔 ${index + 2} 〕────────────\n` +
        `│ 🎬 *${video.title || 'Sin título'}*\n` +
        `│ 👤 ${video.channel || 'Desconocido'}\n` +
        `│ ⏱️ ${video.duration || 'Desconocida'}\n` +
        `│ 👁️ ${video.views || 'Desconocidas'}\n` +
        `│ 🔗 ${video.url || 'Sin URL'}\n` +
        `╰────────────────────\n\n`
    })

    lista += `🤖 Powered by Lempi API`

    await sock.sendMessage(
      jid,
      {
        text: lista
      },
      { quoted: msg }
    )
  }

} catch (error) {
  console.error('[YTS]', error)

  await sock.sendMessage(
    jid,
    {
      text:
        `❌ *Error al buscar en YouTube*\n\n` +
        `> ${error.message || 'Error desconocido'}`
    },
    { quoted: msg }
  )
}

}
}