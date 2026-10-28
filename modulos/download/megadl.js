const { crearComandoArchivo } = require('../../lib/comandosArchivo')

module.exports = crearComandoArchivo({
  name: 'megadl',
  aliases: ['meganz'],
  description: 'Descarga un archivo de MEGA (necesita el módulo megajs)',
  sitio: 'mega',
  ejemplo: 'https://mega.nz/file/abc#clave',
})
