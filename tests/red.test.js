// Red de subbots: heartbeats por archivo y liderazgo de grupos.
const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('fs')
const path = require('path')
const { RAIZ, respaldar } = require('./_util')

const carpetaRed = path.join(RAIZ, 'data', 'red')
const carpetaHeartbeats = path.join(carpetaRed, 'heartbeats')
const carpetaLocks = path.join(carpetaRed, 'locks')
const ID = 'PRUEBA_RED'
const archivoLock = path.join(carpetaLocks, '120363999_g.us.json')

let restaurar
let red

test.before(() => {
  restaurar = respaldar([path.join(carpetaHeartbeats, `${ID}.json`), archivoLock])
  red = require('../lib/red')
})
test.after(() => restaurar())

test('cada proceso escribe su propio archivo de heartbeat', () => {
  red.iniciarHeartbeat(ID)()
  const ruta = path.join(carpetaHeartbeats, `${ID}.json`)
  assert.ok(fs.existsSync(ruta))
  assert.ok(Math.abs(JSON.parse(fs.readFileSync(ruta, 'utf8')).ts - Date.now()) < 5000)
})

test('un líder con heartbeat fresco lidera su grupo', () => {
  fs.mkdirSync(carpetaLocks, { recursive: true })
  fs.writeFileSync(archivoLock, JSON.stringify({ owner: ID, ts: Date.now() }))
  assert.ok(red.gruposLiderados(ID).length >= 1)
})

test('con el heartbeat vencido (>45 s) pierde el liderazgo', () => {
  fs.writeFileSync(path.join(carpetaHeartbeats, `${ID}.json`), JSON.stringify({ ts: Date.now() - 120000 }))
  assert.equal(red.gruposLiderados(ID).length, 0)
})

test('sin bot principal activo no hay presencia en el grupo', () => {
  assert.equal(red.principalPresenteEnGrupo('cualquiera@g.us'), false)
})
