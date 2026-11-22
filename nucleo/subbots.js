// Código Oficial de YuiBot-MD.by AmilcarGit
import fs from 'fs'
import path from 'path'
import ajustes from '../ajustes.js'
import { conectar } from './enlace.js'

const activos = new Map()

export const listarSubbots = () => [...activos].filter(([, sock]) => sock).map(([numero]) => numero)

export function crearSubbot(numero) {
  if (activos.has(numero)) throw new Error('Ya tienes un sub-bot activo.')
  if (activos.size >= ajustes.maxSubbots) throw new Error('No hay cupos disponibles.')

  activos.set(numero, null)
  const carpeta = path.join(ajustes.sesionSubbots, numero)

  return new Promise((resolver, rechazar) => {
    const fallar = error => {
      activos.delete(numero)
      rechazar(error)
    }
    conectar({
      carpeta,
      numero,
      alCodigo: resolver,
      alError: fallar,
      alAbrir: sock => activos.set(numero, sock),
      alSalir: () => activos.delete(numero)
    }).catch(fallar)
  })
}

function vinculado(numero) {
  const creds = path.join(ajustes.sesionSubbots, numero, 'creds.json')
  if (!fs.existsSync(creds)) return false
  try {
    return Boolean(JSON.parse(fs.readFileSync(creds, 'utf8')).registered)
  } catch {
    return false
  }
}

export async function restaurarSubbots() {
  if (!fs.existsSync(ajustes.sesionSubbots)) return
  for (const numero of fs.readdirSync(ajustes.sesionSubbots)) {
    if (!vinculado(numero) || activos.size >= ajustes.maxSubbots) continue
    activos.set(numero, null)
    await conectar({
      carpeta: path.join(ajustes.sesionSubbots, numero),
      alAbrir: sock => activos.set(numero, sock),
      alSalir: () => activos.delete(numero)
    })
  }
}
