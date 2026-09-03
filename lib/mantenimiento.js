//CÓDIGO ORIGINAL DE YUIBOT-MD
const fs = require('fs')
const path = require('path')

function limpiarPreKeysAntiguas(rutaSession, diasAntiguedad = 3) {
  if (!fs.existsSync(rutaSession)) return { eliminados: 0 }

  const limite = Date.now() - diasAntiguedad * 24 * 60 * 60 * 1000
  let eliminados = 0

  for (const archivo of fs.readdirSync(rutaSession)) {
    if (!archivo.startsWith('pre-key-')) continue

    const rutaCompleta = path.join(rutaSession, archivo)
    try {
      const stats = fs.statSync(rutaCompleta)
      if (stats.mtimeMs < limite) {
        fs.unlinkSync(rutaCompleta)
        eliminados++
      }
    } catch (error) {
      console.error(`[MANTENIMIENTO] No se pudo procesar ${archivo}:`, error.message)
    }
  }

  return { eliminados }
}

function respaldarSesion(rutaSession, rutaBackups, maxBackups = 5) {
  if (!fs.existsSync(rutaSession)) return null
  if (!fs.existsSync(rutaBackups)) fs.mkdirSync(rutaBackups, { recursive: true })

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
  const destino = path.join(rutaBackups, `session-${timestamp}`)

  fs.cpSync(rutaSession, destino, { recursive: true })

  const backups = fs
    .readdirSync(rutaBackups)
    .filter((nombre) => nombre.startsWith('session-'))
    .sort()

  while (backups.length > maxBackups) {
    const masViejo = backups.shift()
    fs.rmSync(path.join(rutaBackups, masViejo), { recursive: true, force: true })
  }

  return destino
}

module.exports = { limpiarPreKeysAntiguas, respaldarSesion }