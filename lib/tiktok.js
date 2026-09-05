//CÓDIGO ORIGINAL DE YUIBOT-MD
const { APIS } = require('../defaults')

const API_URL = 'https://api.lempi.lat/dl/tiktok'

function obtenerKeys() {
  return [APIS.LEMPI_KEY, APIS.LEMPI_KEY_2].filter(Boolean)
}

async function pedirTikTok(url) {
  const keys = obtenerKeys()
  let ultimoError = null

  for (const key of keys) {
    try {
      const query = new URLSearchParams({ url, apikey: key })
      const resp = await fetch(`${API_URL}?${query.toString()}`)
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`)

      const data = await resp.json()
      if (!data?.status || !data?.datos?.url) {
        throw new Error(data?.message || data?.error || 'La API no devolvió el enlace de descarga')
      }

      return data
    } catch (error) {
      ultimoError = error
      console.log('[TIKTOK] Falló con una key, probando la siguiente si hay:', error.message)
    }
  }

  throw ultimoError || new Error('Ninguna API key de Lempi funcionó')
}

module.exports = { pedirTikTok }