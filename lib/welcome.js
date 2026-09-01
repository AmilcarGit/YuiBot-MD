//CÓDIGO ORIGINAL DE YUIBOT-MD
const API_URL = 'https://api.lempi.lat/api/canvas/welcomev1'

async function generarImagenBienvenida({ username, guildName, guildIcon, memberCount }) {
  const url =
    `${API_URL}?username=${encodeURIComponent(username)}` +
    `&guildName=${encodeURIComponent(guildName)}` +
    `&guildIcon=${encodeURIComponent(guildIcon)}` +
    `&memberCount=${encodeURIComponent(memberCount)}`

  const resp = await fetch(url)
  if (!resp.ok) throw new Error(`HTTP ${resp.status}`)

  return Buffer.from(await resp.arrayBuffer())
}

module.exports = { generarImagenBienvenida }