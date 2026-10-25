// Ningún comando puede pisar el nombre o alias de otro (el cargador se queda
// con el último sin avisar). Se carga con el cargador real; las dependencias
// que falten en esta máquina se sustituyen por un stub vacío.
const test = require('node:test')
const assert = require('node:assert/strict')
const Module = require('module')

const original = Module._load
const stub = new Proxy(function () {}, {
  get: (_, k) => (k === Symbol.toPrimitive ? () => '' : k === 'then' ? undefined : stub),
  apply: () => stub,
  construct: () => stub,
})

function cargarTodo() {
  Module._load = function (peticion, ...resto) {
    try {
      return original.call(this, peticion, ...resto)
    } catch (error) {
      if (error.code === 'MODULE_NOT_FOUND' || /ERR_REQUIRE_ESM|ERR_MODULE/.test(error.code || '')) return stub
      throw error
    }
  }
  const choques = []
  class MapaVigilado extends Map {
    set(clave, valor) {
      if (this.has(clave) && this.get(clave) !== valor) choques.push(`"${clave}": ${this.get(clave).name} ← ${valor.name}`)
      return super.set(clave, valor)
    }
  }
  const consola = { log: console.log, warn: console.warn }
  console.log = console.warn = () => {}
  try {
    const { loadCommands } = require('../lib/cargador')
    const commands = new MapaVigilado()
    loadCommands(commands, new Map())
    return { commands, choques }
  } finally {
    Object.assign(console, consola)
    Module._load = original
  }
}

const { commands, choques } = cargarTodo()
const unicos = [...new Set(commands.values())]

test('no hay nombres ni alias repetidos entre comandos', () => {
  assert.deepEqual(choques, [])
})

test('un comando no repite su propio nombre como alias ni tiene alias duplicados', () => {
  for (const c of unicos) {
    const alias = c.aliases || []
    assert.deepEqual(alias.filter((a, i) => alias.indexOf(a) !== i || a === c.name), [], `en ${c.name}`)
  }
})

test('los nombres y alias están en minúscula y sin espacios (el handler pasa a minúscula)', () => {
  for (const clave of commands.keys()) {
    assert.equal(clave, clave.toLowerCase(), clave)
    assert.ok(!/\s/.test(clave), clave)
  }
})

test('todo comando tiene descripción y categoría', () => {
  for (const c of unicos) {
    assert.ok(c.description, `${c.name} sin descripción`)
    assert.ok(c.category, `${c.name} sin categoría`)
  }
})
