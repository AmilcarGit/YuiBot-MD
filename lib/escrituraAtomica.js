//CÓDIGO ORIGINAL DE YUIBOT-MD
const fs = require('fs')
const path = require('path')

function escribirJSONAtomico(rutaDestino, data) {
  const carpeta = path.dirname(rutaDestino)
  if (!fs.existsSync(carpeta)) fs.mkdirSync(carpeta, { recursive: true })

  const rutaTemporal = path.join(carpeta, `.tmp-${path.basename(rutaDestino)}-${process.pid}-${Date.now()}`)

  fs.writeFileSync(rutaTemporal, JSON.stringify(data, null, 2))
  fs.renameSync(rutaTemporal, rutaDestino)
}

module.exports = { escribirJSONAtomico }