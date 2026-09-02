//CÓDIGO ORIGINAL DE YUIBOT-MD
const { APIS } = require('../defaults')

const URL_VIDEO = 'https://api.lempi.lat/dl/ytv'
const URL_AUDIO = 'https://api.lempi.lat/dl/yta'
const URL_BUSQUEDA = 'https://api.lempi.lat/s/youtube'

function obtenerKeys() {
  return [APIS.LEMPI_KEY, APIS.LEMPI_KEY_2].filter(Boolean)
}

async function pedirConFallback(baseUrl, params, validar) {
  const keys = obtenerKeys()
  let ultimoError = null

  for (const key of keys) {
    try {
      const query = new URLSearchParams({ ...params, apikey: key })
      const resp = await fetch(`${baseUrl}?${query.toString()}`)
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`)

      const data = await resp.json()
      const error = validar(data)
      if (error) throw new Error(error)

      return data
    } catch (error) {
      ultimoError = error
      console.log('[YOUTUBE] Falló con una key, probando la siguiente si hay:', error.message)
    }
  }

  throw ultimoError || new Error('Ninguna API key funcionó')
}

function pedirVideo(url) {
  return pedirConFallback(URL_VIDEO, { url }, (data) => {
    if (!data?.status || !data?.datos?.url) return data?.message || data?.error || 'La API no devolvió el enlace de descarga'
    return null
  })
}

function pedirAudio(url) {
  return pedirConFallback(URL_AUDIO, { url }, (data) => {
    if (!data?.status || !data?.datos?.url) return data?.message || data?.error || 'La API no devolvió el enlace de descarga'
    return null
  })
}

function pedirBusqueda(query) {
  return pedirConFallback(URL_BUSQUEDA, { query }, (data) => {
    if (!data?.status || !data?.datos?.results?.videos?.length) return data?.message || data?.error || 'La API no devolvió resultados válidos'
    return null
  })
}

module.exports = { pedirVideo, pedirAudio, pedirBusqueda }