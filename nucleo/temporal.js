// Código Oficial de YuiBot-MD.by AmilcarGit
import fs from 'fs'
import path from 'path'

const carpetas = ['temporal', 'medios']

function vaciar() {
  const ruta = path.resolve('temporal')
  for (const nombre of fs.readdirSync(ruta)) {
    fs.rmSync(path.join(ruta, nombre), { recursive: true, force: true })
  }
}

export function limpiarTemporal() {
  for (const carpeta of carpetas) fs.mkdirSync(carpeta, { recursive: true })
  vaciar()
  setInterval(vaciar, 3600000).unref()
}
