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

/**
 * Almacén JSON con caché en memoria para archivos grandes que se leen en
 * cada mensaje (ej. data/usuarios.json). Evita volver a leer y parsear el
 * archivo entero cuando no cambió.
 *
 * - leer(): devuelve SIEMPRE el mismo objeto cacheado mientras el archivo
 *   no cambie (se compara inodo + tamaño + mtime con un stat, ~5 µs). Como
 *   escribirJSONAtomico reemplaza el archivo por rename, un cambio hecho por
 *   OTRO proceso (main.js / subbots) cambia el inodo y fuerza una relectura.
 * - guardar(data): escritura atómica y refresco de la caché.
 *
 * Importante: quien llame a leer() puede modificar el objeto devuelto, pero
 * debe llamar a guardar() con él. Si la escritura falla, la caché se descarta
 * para no conservar cambios que nunca llegaron al disco.
 *
 * Para archivos chicos (unos pocos KB) no hace falta: releerlos cuesta ~5 µs.
 */
function crearAlmacenCacheado(ruta, valorInicial = () => ({})) {
  let cache = null
  let firma = null

  const firmaArchivo = () => {
    try {
      const s = fs.statSync(ruta)
      return `${s.ino}:${s.size}:${s.mtimeMs}`
    } catch {
      return null
    }
  }

  return {
    leer() {
      const actual = firmaArchivo()
      if (cache && actual && actual === firma) return cache

      if (!actual) {
        const inicial = valorInicial()
        escribirJSONAtomico(ruta, inicial)
        cache = inicial
        firma = firmaArchivo()
        return cache
      }

      try {
        cache = JSON.parse(fs.readFileSync(ruta, 'utf-8'))
        firma = actual
      } catch {
        // Archivo corrupto: mismo comportamiento de antes (se parte de vacío),
        // pero sin cachear para reintentar la lectura la próxima vez.
        cache = valorInicial()
        firma = null
      }
      return cache
    },

    guardar(data) {
      try {
        escribirJSONAtomico(ruta, data)
      } catch (error) {
        cache = null
        firma = null
        throw error
      }
      cache = data
      firma = firmaArchivo()
    },
  }
}

module.exports = { escribirJSONAtomico, crearAlmacenCacheado }
