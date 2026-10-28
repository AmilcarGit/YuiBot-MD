const { crearComandoArchivo } = require('../../lib/comandosArchivo')

module.exports = crearComandoArchivo({
  name: 'gdrive',
  aliases: ['drivedl', 'googledrive'],
  description: 'Descarga un archivo público de Google Drive',
  sitio: 'gdrive',
  ejemplo: 'https://drive.google.com/file/d/1AbC.../view',
})
