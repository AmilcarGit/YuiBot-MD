const { crearComandoDescarga } = require('../../lib/comandosDescarga')

module.exports = crearComandoDescarga({
  name: 'twitter',
  aliases: ['xdl', 'twitterdl'],
  description: 'Descarga fotos, videos y GIFs de un tweet de X/Twitter',
  sitio: 'twitter',
  ejemplo: 'https://x.com/usuario/status/1234567890',
})
