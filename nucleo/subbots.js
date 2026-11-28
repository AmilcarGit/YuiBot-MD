// Código Oficial de YuiBot-MD.by AmilcarGit
import fs from 'fs'
import path from 'path'
import ajustes from '../ajustes.js'

const activos = new Map()
const desde = new Map() // número → momento en que conectó
const enlace = () => import('./enlace.js') // carga perezosa: así este módulo se puede probar sin WhatsApp

const configs = new Map() // número → { prefijo?, nombre? }
const archivoConfig = numero => path.join(ajustes.sesionSubbots, numero, 'yui.json')
const numeroDe = sock => String(sock?.user?.id || '').replace(/:\d+(?=@)/, '').replace(/@.*/, '')

/** Ajustes propios de un sub-bot (prefijo y nombre), guardados junto a su sesión. */
export function configSubbot(numero) {
  if (!configs.has(numero)) {
    let c = {}
    try { c = JSON.parse(fs.readFileSync(archivoConfig(numero), 'utf8')) } catch {}
    configs.set(numero, c && typeof c === 'object' ? c : {})
  }
  return configs.get(numero)
}
export function guardarConfigSubbot(numero, parcial) {
  const c = { ...configSubbot(numero), ...parcial }
  for (const k of Object.keys(c)) if (c[k] === undefined || c[k] === null) delete c[k]
  configs.set(numero, c)
  fs.mkdirSync(path.join(ajustes.sesionSubbots, numero), { recursive: true })
  fs.writeFileSync(archivoConfig(numero), JSON.stringify(c))
  return c
}
export const esSubbot = sock => activos.has(numeroDe(sock))
/** Prefijos que entiende este bot: un sub-bot con prefijo propio usa solo ese; el resto, los de ajustes. */
export const prefijosDe = sock => { const n = numeroDe(sock); const p = activos.has(n) ? configSubbot(n).prefijo : null; return p ? [p] : ajustes.prefijos }
export const nombreDe = sock => { const n = numeroDe(sock); return (activos.has(n) && configSubbot(n).nombre) || ajustes.nombre }

export const NUMERO_VALIDO = /^\d{6,15}$/

export const listarSubbots = () => [...activos].filter(([, sock]) => sock).map(([numero]) => numero)

export async function crearSubbot(numero) {
  const { conectar } = await enlace()
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
      alAbrir: sock => { activos.set(numero, sock); desde.set(numero, Date.now()) },
      alSalir: () => { activos.delete(numero); desde.delete(numero) }
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
    const { conectar } = await enlace()
    await conectar({
      carpeta: path.join(ajustes.sesionSubbots, numero),
      alAbrir: sock => { activos.set(numero, sock); desde.set(numero, Date.now()) },
      alSalir: () => { activos.delete(numero); desde.delete(numero) }
    })
  }
}

/** Estado de un sub-bot: { existe, conectado, desde }. */
export function infoSubbot(numero) {
  const existe = activos.has(numero)
  return { existe, conectado: Boolean(activos.get(numero)), desde: desde.get(numero) || null }
}

export const cupos = () => ({ usados: activos.size, maximo: ajustes.maxSubbots, libres: Math.max(0, ajustes.maxSubbots - activos.size) })

export const tiempoActivo = (ms, ahora = Date.now()) => {
  const s = Math.max(0, Math.floor((ahora - ms) / 1000)); const d = Math.floor(s / 86400); const h = Math.floor((s % 86400) / 3600); const m = Math.floor((s % 3600) / 60)
  return d ? `${d} d ${h} h` : h ? `${h} h ${m} min` : `${m} min`
}

/** Cierra la sesión de un sub-bot, borra sus datos y libera el cupo. Devuelve false si no existía. */
export async function detenerSubbot(numero) {
  if (!NUMERO_VALIDO.test(String(numero))) throw new Error('Ese número no es válido.')
  const sock = activos.get(numero)
  const carpeta = path.join(ajustes.sesionSubbots, numero)
  if (!activos.has(numero) && !fs.existsSync(carpeta)) return false
  try { await sock?.logout() } catch {}
  try { sock?.end?.(undefined) } catch {}
  fs.rmSync(carpeta, { recursive: true, force: true })
  activos.delete(numero); desde.delete(numero); configs.delete(numero)
  return true
}

export const _interno = { activos, desde, configs } // solo para pruebas
