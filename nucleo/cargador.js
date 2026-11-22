// Código Oficial de YuiBot-MD.by AmilcarGit
import path from 'path'
import { pathToFileURL } from 'url'
import chokidar from 'chokidar'

const raiz = path.resolve('habilidades')
const porArchivo = new Map()

export const habilidades = new Map()

export const listar = () => [...new Set(porArchivo.values())]

function reindexar() {
  habilidades.clear()
  for (const habilidad of porArchivo.values()) {
    habilidades.set(habilidad.nombre, habilidad)
    for (const alias of habilidad.alias || []) habilidades.set(alias, habilidad)
  }
}

async function cargar(ruta) {
  try {
    const url = `${pathToFileURL(ruta).href}?v=${Date.now()}`
    const { default: habilidad } = await import(url)
    if (!habilidad?.nombre || typeof habilidad.ejecutar !== 'function') return
    porArchivo.set(ruta, habilidad)
    reindexar()
  } catch (error) {
    console.error(`Error en ${path.relative(raiz, ruta)}: ${error.message}`)
  }
}

function quitar(ruta) {
  porArchivo.delete(ruta)
  reindexar()
}

export function iniciarCargador() {
  return new Promise(resolver => {
    const pendientes = []
    const esJs = ruta => ruta.endsWith('.js')
    chokidar
      .watch(raiz, { awaitWriteFinish: { stabilityThreshold: 200 } })
      .on('add', ruta => esJs(ruta) && pendientes.push(cargar(ruta)))
      .on('change', ruta => esJs(ruta) && cargar(ruta))
      .on('unlink', ruta => esJs(ruta) && quitar(ruta))
      .on('ready', () => Promise.all(pendientes).then(resolver))
  })
}
