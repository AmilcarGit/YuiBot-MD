//CÓDIGO ORIGINAL DE YUIBOT-MD
// Respaldo de .instagram cuando yt-dlp no está disponible: API gratuita de Delirius.
const delirius = require('./delirius')

function descargarInstagram(link) {
  return delirius.instagram(link)
}

module.exports = { descargarInstagram }
