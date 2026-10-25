//CÓDIGO ORIGINAL DE YUIBOT-MD
// Respaldo de .tiktok cuando yt-dlp no está disponible: API gratuita de Delirius.
const delirius = require('./delirius')

function pedirTikTok(url) {
  return delirius.tiktok(url)
}

module.exports = { pedirTikTok }
