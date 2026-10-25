const test = require('node:test')
const assert = require('node:assert/strict')
const { reintentar, esErrorPasajero } = require('../lib/reintentar')

test('reconoce el error de subida de WhatsApp como pasajero', () => {
  assert.ok(esErrorPasajero(new Error('Media upload failed on all hosts')))
  assert.ok(esErrorPasajero({ output: { statusCode: 500 } }))
  assert.ok(esErrorPasajero(Object.assign(new TypeError('fetch failed'), { cause: { code: 'UND_ERR_CONNECT_TIMEOUT' } })))
  assert.ok(!esErrorPasajero(new Error('Archivo inválido')))
})

test('reintenta hasta que funciona', async () => {
  let llamadas = 0
  const r = await reintentar(async () => {
    if (++llamadas < 3) throw new Error('Media upload failed on all hosts')
    return 'ok'
  }, { esperaMs: 1 })
  assert.equal(r, 'ok')
  assert.equal(llamadas, 3)
})

test('no reintenta errores que no son pasajeros', async () => {
  let llamadas = 0
  await assert.rejects(reintentar(async () => { llamadas++; throw new Error('formato inválido') }, { esperaMs: 1 }), /formato/)
  assert.equal(llamadas, 1)
})

test('se rinde tras agotar los intentos', async () => {
  let llamadas = 0
  await assert.rejects(reintentar(async () => { llamadas++; throw new Error('timeout') }, { intentos: 2, esperaMs: 1 }), /timeout/)
  assert.equal(llamadas, 2)
})
