//CÓDIGO ORIGINAL DE YUIBOT-MD
const { APIS } = require('../defaults')

const API_URL = 'https://dv-yer-api.online/instagram'

async function descargarInstagram(link) {
  const url = `${API_URL}?mode=link&url=${encodeURIComponent(link)}&pick=1&lang=es&apikey=${encodeURIComponent(APIS.DVYER_KEY)}`
  const resp = await fetch(url)
  if (!resp.ok) throw new Error(`HTTP ${resp.status}`)

  const data = await resp.json()

  if (!data?.ok || !data?.selected?.download_url) {
    throw new Error(data?.message || 'No se pudo obtener el video')
  }

  return data
}

module.exports = { descargarInstagram }
