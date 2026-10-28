const { crearComandoDescarga } = require('../../lib/comandosDescarga')

module.exports = crearComandoDescarga({
  name: 'pindl',
  aliases: ['pinterestdl', 'pindescargar'],
  description: 'Descarga la imagen o video de un pin de Pinterest por enlace',
  sitio: 'pinterest',
  ejemplo: 'https://pin.it/abc123',
})
