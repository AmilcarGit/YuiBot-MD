const { crearComandoDescarga } = require('../../lib/comandosDescarga')

module.exports = crearComandoDescarga({
  name: 'likee',
  aliases: ['likeedl'],
  description: 'Descarga videos de Likee',
  sitio: 'likee',
  ejemplo: 'https://likee.video/@usuario/video/123',
})
