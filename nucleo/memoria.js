// Código Oficial de YuiBot-MD.by AmilcarGit
import fs from 'fs'
import path from 'path'
import ajustes from '../ajustes.js'

const carpeta = path.resolve('data')
const nombres = ['usuarios', 'chats']
const cache = { usuarios: {}, chats: {} }
let db = null

const base = {
  nombre: '',
  registrado: false,
  monedas: 0,
  xp: 0,
  nivel: 1,
  mensajes: 0,
  racha: 0,
  ultimoDaily: 0,
  ultimoTrabajo: 0,
  esperaTrabajo: 0,
  ultimoAdivina: 0,
  ultimoXp: 0,
  trabajo: '',
  inventario: {},
  coleccion: {},
  logros: []
}

const baseChat = {
  bienvenida: false,
  antienlaces: false,
  antifalsos: false,
  soloAdmin: false
}

const archivo = nombre => path.join(carpeta, `${nombre}.json`)

const ultimo = {}
const respaldos = {}
const CADA_RESPALDO = 600000

const leerJson = ruta => JSON.parse(fs.readFileSync(ruta, 'utf8'))

function leer(nombre) {
  if (db) {
    const fila = db.prepare('SELECT datos FROM colecciones WHERE nombre = ?').get(nombre)
    return fila ? JSON.parse(fila.datos) : {}
  }

  const ruta = archivo(nombre)
  if (!fs.existsSync(ruta)) return {}

  try {
    return leerJson(ruta)
  } catch {
    // Un archivo dañado nunca se sobrescribe con datos vacíos: se aparta y se intenta el respaldo.
    const aparte = ruta.replace(/\.json$/, `.corrupto-${Date.now()}.json`)
    fs.renameSync(ruta, aparte)
    console.error(`${nombre}.json estaba dañado; se guardó como ${path.basename(aparte)}`)
    try {
      const datos = leerJson(`${ruta}.bak`)
      console.error(`${nombre} se recuperó desde la copia de respaldo.`)
      return datos
    } catch {
      return {}
    }
  }
}

function escribir(nombre, datos) {
  const texto = JSON.stringify(datos)
  if (ultimo[nombre] === texto) return

  if (db) {
    db.prepare('INSERT OR REPLACE INTO colecciones (nombre, datos) VALUES (?, ?)').run(nombre, texto)
    ultimo[nombre] = texto
    return
  }

  const ruta = archivo(nombre)
  if (fs.existsSync(ruta) && Date.now() - (respaldos[nombre] || 0) > CADA_RESPALDO) {
    fs.copyFileSync(ruta, `${ruta}.bak`)
    respaldos[nombre] = Date.now()
  }
  const temporal = `${ruta}.tmp`
  fs.writeFileSync(temporal, texto)
  fs.renameSync(temporal, ruta)
  ultimo[nombre] = texto
}

export async function iniciarMemoria() {
  fs.mkdirSync(carpeta, { recursive: true })
  if (ajustes.motor === 'sqlite') {
    const { default: Database } = await import('better-sqlite3')
    db = new Database(path.join(carpeta, 'yui.db'))
    db.exec('CREATE TABLE IF NOT EXISTS colecciones (nombre TEXT PRIMARY KEY, datos TEXT NOT NULL)')
  }
  for (const nombre of nombres) cache[nombre] = leer(nombre)
  setInterval(guardar, 15000).unref()
}

export function guardar() {
  for (const nombre of nombres) escribir(nombre, cache[nombre])
}

export function usuario(id) {
  cache.usuarios[id] ??= structuredClone(base)
  return cache.usuarios[id]
}

export function chat(id) {
  cache.chats[id] ??= structuredClone(baseChat)
  return cache.chats[id]
}

export const todosUsuarios = () => cache.usuarios

export const exportar = () => ({ usuarios: cache.usuarios })

export function fusionar(remotos = {}) {
  for (const [id, remoto] of Object.entries(remotos)) {
    const local = cache.usuarios[id]
    if (!local || (remoto.xp ?? 0) > local.xp) {
      cache.usuarios[id] = { ...structuredClone(base), ...remoto }
    }
  }
}
