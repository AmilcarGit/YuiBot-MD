const { crearComandoDescarga } = require('../../lib/comandosDescarga')

module.exports = crearComandoDescarga({
  name: 'threads',
  aliases: ['threadsdl'],
  description: 'Descarga videos y fotos de Threads',
  sitio: 'threads',
  ejemplo: 'https://www.threads.net/@usuario/post/ABC123',
})
