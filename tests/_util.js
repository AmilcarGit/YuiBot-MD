// Utilidades compartidas por las pruebas. No es un archivo de pruebas.
const fs = require('fs')
const path = require('path')

const RAIZ = path.join(__dirname, '..')

const RAICES_TEMPORALES = ['data', 'subbots']

function listarCarpetas(base) {
  const encontradas = []
  const recorrer = (dir) => {
    if (!fs.existsSync(dir)) return
    for (const entrada of fs.readdirSync(dir, { withFileTypes: true })) {
      if (!entrada.isDirectory()) continue
      const ruta = path.join(dir, entrada.name)
      encontradas.push(ruta)
      recorrer(ruta)
    }
  }
  recorrer(base)
  return encontradas
}

/**
 * Respalda archivos/carpetas antes de una prueba y devuelve una función que
 * los deja exactamente como estaban (y borra lo que la prueba haya creado,
 * incluidas las carpetas que haya dejado vacías).
 * Así las pruebas nunca ensucian ni pierden los datos reales de data/.
 */
function respaldar(rutas) {
  const previo = rutas.map((ruta) => ({
    ruta,
    existia: fs.existsSync(ruta),
    contenido: fs.existsSync(ruta) && fs.statSync(ruta).isFile() ? fs.readFileSync(ruta) : null,
  }))

  const raices = RAICES_TEMPORALES.map((nombre) => path.join(RAIZ, nombre))
  const carpetasPrevias = new Set(raices.flatMap((raiz) => [raiz, ...listarCarpetas(raiz)]))
  const raicesExistian = new Set(raices.filter((raiz) => fs.existsSync(raiz)))

  return function restaurar() {
    for (const { ruta, existia, contenido } of previo) {
      if (existia && contenido) fs.writeFileSync(ruta, contenido)
      else if (!existia) fs.rmSync(ruta, { recursive: true, force: true })
    }

    // Carpetas creadas durante la prueba: se quitan (de la más profunda a la
    // más superficial) solo si quedaron vacías.
    const nuevas = raices
      .flatMap((raiz) => [raiz, ...listarCarpetas(raiz)])
      .filter((carpeta) => !carpetasPrevias.has(carpeta) || (!raicesExistian.has(carpeta) && raices.includes(carpeta)))
      .sort((a, b) => b.length - a.length)

    for (const carpeta of nuevas) {
      try {
        if (fs.existsSync(carpeta) && fs.readdirSync(carpeta).length === 0) fs.rmdirSync(carpeta)
      } catch {}
    }
  }
}

module.exports = { RAIZ, respaldar }
