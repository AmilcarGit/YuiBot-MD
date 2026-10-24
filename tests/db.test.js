// Base de datos de usuarios/grupos: caché, cambios de otros procesos y avisos de antilink.
const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('fs')
const path = require('path')
const { execFileSync } = require('child_process')
const { RAIZ, respaldar } = require('./_util')

const carpetaData = path.join(RAIZ, 'data')
const archivoUsuarios = path.join(carpetaData, 'usuarios.json')
const archivoGrupos = path.join(carpetaData, 'grupos.json')
const archivoCache = path.join(carpetaData, 'prueba-cache.json')

let restaurar
let db

test.before(() => {
  restaurar = respaldar([archivoUsuarios, archivoGrupos, archivoCache])
  fs.rmSync(archivoUsuarios, { force: true }) // parte siempre de cero
  db = require('../lib/db')
})
test.after(() => restaurar())

test('guardar y leer un usuario', () => {
  db.guardarUsuario('51111', { xp: 10, monedas: 5 })
  assert.equal(db.obtenerUsuario('51111').xp, 10)
  assert.equal(db.obtenerUsuario('no-existe'), null)
})

test('lo que devuelve obtenerUsuario es una copia: modificarla no contamina la caché', () => {
  const copia = db.obtenerUsuario('51111')
  copia.xp = 9999
  assert.equal(db.obtenerUsuario('51111').xp, 10)
})

test('detecta cambios hechos por OTRO proceso (no sirve datos viejos)', () => {
  execFileSync(process.execPath, ['-e', `
    const { escribirJSONAtomico } = require(${JSON.stringify(path.join(RAIZ, 'lib', 'escrituraAtomica'))})
    const fs = require('fs')
    const datos = JSON.parse(fs.readFileSync(${JSON.stringify(archivoUsuarios)}, 'utf8'))
    datos['51111'].monedas = 777
    datos['52222'] = { xp: 1 }
    escribirJSONAtomico(${JSON.stringify(archivoUsuarios)}, datos)
  `])
  assert.equal(db.obtenerUsuario('51111').monedas, 777)
  assert.equal(db.obtenerUsuario('52222').xp, 1)
})

test('economía y XP sobre datos escritos por otro proceso', () => {
  assert.equal(db.agregarMonedas('51111', 3), 780)

  const primero = db.agregarXpConCooldown('53333', { COOLDOWN_MS: 60000, MIN: 5, MAX: 5 })
  assert.equal(primero.xp, 5)
  assert.equal(db.agregarXpConCooldown('53333', { COOLDOWN_MS: 60000, MIN: 5, MAX: 5 }), null, 'respeta el cooldown')
})

test('una compra sin saldo no modifica nada', () => {
  const r = db.comprarItem('51111', { id: 'ins1', tipo: 'insignia', precio: 100000 })
  assert.deepEqual({ exito: r.exito, motivo: r.motivo }, { exito: false, motivo: 'saldo' })
  assert.equal(db.obtenerUsuario('51111').monedas, 780)
})

test('un archivo corrupto no revienta: se parte de vacío', () => {
  fs.writeFileSync(archivoUsuarios, '{corrupto')
  assert.doesNotThrow(() => db.guardarUsuario('54444', { xp: 1 }))
  assert.equal(db.obtenerUsuario('54444').xp, 1)
})

test('si falla la escritura, la caché descarta el cambio que no llegó al disco', () => {
  const { crearAlmacenCacheado } = require('../lib/escrituraAtomica')
  const almacen = crearAlmacenCacheado(archivoCache)
  const inicial = almacen.leer()
  inicial.a = 1
  almacen.guardar(inicial)

  const renameOriginal = fs.renameSync
  fs.renameSync = () => { throw new Error('disco lleno') }
  try {
    const objeto = almacen.leer()
    objeto.b = 2
    assert.throws(() => almacen.guardar(objeto), /disco lleno/)
  } finally {
    fs.renameSync = renameOriginal
  }
  assert.ok(!('b' in almacen.leer()), 'el cambio no guardado no debe quedar en memoria')
})

test('antilink: los avisos se cuentan por grupo (Fase B)', () => {
  const u = '51000000001'
  assert.equal(db.registrarAvisoAntilink(u, 'A@g.us'), 1)
  assert.equal(db.registrarAvisoAntilink(u, 'A@g.us'), 2)
  assert.equal(db.registrarAvisoAntilink(u, 'B@g.us'), 1, 'otro grupo empieza en 1')
  assert.equal(db.registrarAvisoAntilink(u, 'A@g.us'), 3)

  db.reiniciarAvisosAntilink(u, 'A@g.us')
  assert.equal(db.registrarAvisoAntilink(u, 'A@g.us'), 1, 'reiniciar A vuelve a 1')
  assert.equal(db.registrarAvisoAntilink(u, 'B@g.us'), 2, 'reiniciar A no toca B')
})

test('antilink sin grupo mantiene el contador global (compatibilidad)', () => {
  const u = '51000000002'
  assert.equal(db.registrarAvisoAntilink(u), 1)
  assert.equal(db.registrarAvisoAntilink(u), 2)
})
