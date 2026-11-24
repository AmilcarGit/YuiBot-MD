import test from 'node:test'
import assert from 'node:assert/strict'
import dar from '../habilidades/economia/dar.js'

const crear = (args, regalar) => {
  const salida = []
  return { salida, ctx: { args, prefijo: '.', usuario: { monedas: 500 }, regalar, responder: async t => salida.push(t) } }
}

test('dar: uso incorrecto y límites', async () => {
  let { ctx, salida } = crear([], async () => ({}))
  await dar.ejecutar({}, {}, ctx); assert.match(salida[0], /Uso/)
  ;({ ctx, salida } = crear(['51912345678', '999999'], async () => ({})))
  await dar.ejecutar({}, {}, ctx); assert.match(salida[0], /Máximo/)
})

test('dar: transfiere y muestra el nombre', async () => {
  const { ctx, salida } = crear(['51912345678', '200'], async (d, n) => { assert.equal(d, '51912345678'); assert.equal(n, 200); return { nombre: 'Ana' } })
  await dar.ejecutar({}, {}, ctx); assert.match(salida[0], /Ana/)
})

test('dar: el error de la transferencia se explica', async () => {
  const { ctx, salida } = crear(['51912345678', '10'], async () => { throw new Error('No tienes tantas monedas.') })
  await dar.ejecutar({}, {}, ctx); assert.match(salida[0], /No tienes tantas/)
})
