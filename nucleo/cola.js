// Código Oficial de YuiBot-MD.by AmilcarGit
import ajustes from '../ajustes.js'
import { aleatorio, dormir } from './utiles.js'

const colas = new Map()

export function encolar(clave, tarea) {
  const previa = colas.get(clave) || Promise.resolve()
  const siguiente = previa.catch(() => {}).then(async () => {
    await dormir(aleatorio(...ajustes.retardo))
    return tarea()
  })
  colas.set(clave, siguiente)
  siguiente
    .catch(() => {})
    .finally(() => {
      if (colas.get(clave) === siguiente) colas.delete(clave)
    })
  return siguiente
}
