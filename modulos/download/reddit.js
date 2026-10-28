const { crearComandoDescarga } = require('../../lib/comandosDescarga')

module.exports = crearComandoDescarga({
  name: 'reddit',
  aliases: ['redditdl'],
  description: 'Descarga videos, imágenes y galerías de Reddit',
  sitio: 'reddit',
  ejemplo: 'https://www.reddit.com/r/memes/comments/abc123/titulo/',
})
