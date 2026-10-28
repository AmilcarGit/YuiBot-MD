const { crearComandoArchivo } = require('../../lib/comandosArchivo')

module.exports = crearComandoArchivo({
  name: 'mediafire',
  aliases: ['mf', 'mfdl'],
  description: 'Descarga un archivo de MediaFire por enlace',
  sitio: 'mediafire',
  ejemplo: 'https://www.mediafire.com/file/abc123/archivo.zip',
})
