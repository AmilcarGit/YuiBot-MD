// LID → teléfono: el bot debe guardar todo bajo el teléfono real.
const test = require('node:test')
const assert = require('node:assert/strict')
const path = require('path')
const { respaldar } = require('./_util')

const d = (f) => path.join(__dirname, '..', 'data', f)
const restaurar = respaldar([d('usuarios.json'), d('trabajos.json'), d('lid-mapa.json')])
test.after(() => restaurar())

const I = require('../lib/identidad')
const db = require('../lib/db')
const T = require('../lib/trabajos')
const { numeroUsuario } = require('../lib/juegos')

test('chat privado con LID: usa el teléfono de remoteJidAlt', () => {
  const msg = { key: { remoteJid: '181234567890123@lid', remoteJidAlt: '51910000111@s.whatsapp.net' } }
  I.normalizarMensaje(msg)
  assert.equal(numeroUsuario(msg), '51910000111')
})

test('grupo con LID y alterno: ya usa el teléfono y lo aprende', () => {
  const msg = { key: { remoteJid: 'g@g.us', participant: '181111111111111@lid', participantAlt: '51910000222@s.whatsapp.net' } }
  I.normalizarMensaje(msg)
  assert.equal(numeroUsuario(msg), '51910000222')
  assert.equal(I.numeroDe('181111111111111@lid'), '51910000222')
})

test('grupo con LID sin alterno: lo traduce con lo aprendido', () => {
  I.aprender('182222222222222@lid', '51910000333@s.whatsapp.net')
  const msg = { key: { remoteJid: 'g@g.us', participant: '182222222222222@lid' } }
  I.normalizarMensaje(msg)
  assert.equal(numeroUsuario(msg), '51910000333')
})

test('LID desconocido: no inventa nada', () => {
  const msg = { key: { remoteJid: 'g@g.us', participant: '189999999999999@lid' } }
  I.normalizarMensaje(msg)
  assert.equal(msg.key.participantAlt, undefined)
})

test('un mensaje propio (fromMe) no se toca', () => {
  const msg = { key: { fromMe: true, remoteJid: '181@lid', remoteJidAlt: '51900@s.whatsapp.net' } }
  I.normalizarMensaje(msg)
  assert.equal(msg.key.participantAlt, undefined)
})

test('lo guardado bajo un LID se une al teléfono (sumando monedas y trabajos)', () => {
  const lid = '183333333333333'; const pn = '51910000444'
  db.guardarUsuario(lid, { monedas: 100, xp: 50, nombre: 'Viejo' })
  db.guardarUsuario(pn, { monedas: 20, xp: 10, nombre: 'Real' })
  T.transaccion((t) => { t[lid] = { ganado: 30, veces: { minar: 2 } }; t[pn] = { ganado: 5, veces: { minar: 1 } } })
  I.aprender(`${lid}@lid`, `${pn}@s.whatsapp.net`)
  I.unirLid(lid)
  const u = db.obtenerUsuario(pn)
  assert.equal(u.monedas, 120); assert.equal(u.xp, 60); assert.equal(u.nombre, 'Real')
  assert.equal(db.obtenerUsuario(lid), null)
  const t = T.todos()
  assert.equal(t[pn].ganado, 35); assert.equal(t[pn].veces.minar, 3); assert.equal(t[lid], undefined)
})

test('unirLid sin relación conocida no toca nada', () => {
  db.guardarUsuario('184444444444444', { monedas: 7 })
  assert.equal(I.unirLid('184444444444444'), 0)
  assert.equal(db.obtenerUsuario('184444444444444').monedas, 7)
})
