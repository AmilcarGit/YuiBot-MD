//CÓDIGO ORIGINAL DE YUIBOT-MD
const { APIS } = require('../defaults')

const API_URL = 'https://api.lempi.lat/api/canvas/welcomev1'

async function generarImagenBienvenida({ username, guildName, guildIcon, memberCount, avatar, background }) {
  const url =
    `${API_URL}?username=${encodeURIComponent(username)}` +
    `&guildName=${encodeURIComponent(guildName)}` +
    `&guildIcon=${encodeURIComponent(guildIcon)}` +
    `&memberCount=${encodeURIComponent(memberCount)}` +
    `&avatar=${encodeURIComponent(avatar)}` +
    `&background=${encodeURIComponent(background)}` +
    `&quality=80` +
    `&apikey=${encodeURIComponent(APIS.LEMPI_KEY)}`

  const resp = await fetch(url)
  if (!resp.ok) throw new Error(`HTTP ${resp.status}`)

  return Buffer.from(await resp.arrayBuffer())
}

module.exports = { generarImagenBienvenida }