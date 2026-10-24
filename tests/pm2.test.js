// Nombres de procesos PM2 (Fase B).
const test = require('node:test')
const assert = require('node:assert/strict')
const pm2 = require('../lib/pm2')

test('reconoce las dos convenciones de nombre de subbot', () => {
  assert.ok(pm2.esProcesoSubbot('subbot-51999'))
  assert.ok(pm2.esProcesoSubbot('yuibot-subbot-51999'))
})

test('no confunde el bot principal ni nombres ajenos', () => {
  assert.ok(!pm2.esProcesoSubbot('yuibot-md'))
  assert.ok(!pm2.esProcesoSubbot('YuiBot-MD'))
  assert.ok(!pm2.esProcesoSubbot('mi-subbot-1'))
  assert.ok(!pm2.esProcesoSubbot(undefined))
})

test('extrae el número en ambas convenciones', () => {
  assert.equal(pm2.numeroDeProcesoSubbot('subbot-51999'), '51999')
  assert.equal(pm2.numeroDeProcesoSubbot('yuibot-subbot-51999'), '51999')
  assert.equal(pm2.numeroDeProcesoSubbot('otro'), null)
})

test('nombresProcesoSubbot devuelve ambos nombres', () => {
  assert.deepEqual(pm2.nombresProcesoSubbot('1'), ['subbot-1', 'yuibot-subbot-1'])
})

test('nombre real del proceso: usa PM2 si existe y el respaldo si no', () => {
  const previo = { name: process.env.name, pm_id: process.env.pm_id }
  try {
    delete process.env.name
    delete process.env.pm_id
    assert.equal(pm2.nombreProcesoActual('respaldo'), 'respaldo')
    assert.equal(pm2.correEnPm2(), false)

    process.env.name = 'yuibot-md'
    process.env.pm_id = '0'
    assert.equal(pm2.nombreProcesoActual('respaldo'), 'yuibot-md')
    assert.equal(pm2.correEnPm2(), true)
  } finally {
    for (const [k, v] of Object.entries(previo)) {
      if (v === undefined) delete process.env[k]
      else process.env[k] = v
    }
  }
})
