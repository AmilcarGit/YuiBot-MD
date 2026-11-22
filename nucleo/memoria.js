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
  soloAdmin: false,
  tema: ''
}

const archivo = nombre => path.join(carpeta, `${nombre}.json`)

function leer(nombre) {
  if (db) {
    const fila = db.prepare('SELECT datos FROM colecciones WHERE nombre = ?').get(nombre)
    return fila ? JSON.parse(fila.datos) : {}
  }
  try {
    return JSON.parse(fs.readFileSync(archivo(nombre), 'utf8'))
  } catch {
    return {}
  }
}

function escribir(nombre, datos) {
  const texto = JSON.stringify(datos)
  if (db) {
    db.prepare('INSERT OR REPLACE INTO colecciones (nombre, datos) VALUES (?, ?)').run(nombre, texto)
    return
  }
  const temporal = `${archivo(nombre)}.tmp`
  fs.writeFileSync(temporal, texto)
  fs.renameSync(temporal, archivo(nombre))
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
