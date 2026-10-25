// Bloque 5: fechas, recordatorios, AFK, reputación y alertas de red.
const test = require('node:test')
const assert = require('node:assert/strict')
const path = require('path')
const { respaldar } = require('./_util')

const RAIZ = path.join(__dirname, '..')
const restaurar = respaldar([
  path.join(RAIZ, 'data', 'recordatorios.json'),
  path.join(RAIZ, 'data', 'afk.json'),
  path.join(RAIZ, 'data', 'usuarios.json'),
])
test.after(() => restaurar())

const fechas = require('../lib/fechas')
const recordatorios = require('../lib/recordatorios')
const afk = require('../lib/afk')
const reputacion = require('../lib/reputacion')
const alertas = require('../lib/alertasRed')
const config = require('../defaults')

test('interpretarDuracion entiende m/h/d y combinaciones', () => {
  assert.equal(fechas.interpretarDuracion('30m'), 30 * 60000)
  assert.equal(fechas.interpretarDuracion('1h30m'), 90 * 60000)
  assert.equal(fechas.interpretarDuracion('2d'), 2 * 86400000)
  assert.equal(fechas.interpretarDuracion('hola'), null)
  assert.equal(fechas.interpretarDuracion(''), null)
  assert.equal(fechas.interpretarDuracion('0m'), null)
})

test('describirDuracion es legible', () => {
  assert.match(fechas.describirDuracion(90 * 60000), /1 ?h/)
})

test('interpretarFecha rechaza fechas imposibles', () => {
  assert.equal(fechas.interpretarFecha('31/02 10:00', new Date()), null)
})

test('recordatorios: crear, listar, borrar y límite', () => {
  const n = '51900000001'
  const r = recordatorios.crear({ idBot: 'principal', jid: 'x@g.us', numero: n, texto: 'hola', cuando: Date.now() + 1000 })
  assert.equal(recordatorios.listarDe(n).length, 1)
  assert.equal(recordatorios.borrar('otro', r.id), false)
  assert.equal(recordatorios.borrar(n, r.id), true)
  for (let i = 0; i < recordatorios.MAX_POR_USUARIO; i++) {
    recordatorios.crear({ idBot: 'principal', jid: 'x', numero: n, texto: 't', cuando: Date.now() + 1000 })
  }
  assert.throws(() => recordatorios.crear({ idBot: 'principal', jid: 'x', numero: n, texto: 't', cuando: 1 }))
  for (const x of recordatorios.listarDe(n)) recordatorios.borrar(n, x.id)
})

test('recordatorios: solo envía los vencidos de su bot y los quita', async () => {
  const n = '51900000002'
  recordatorios.crear({ idBot: 'principal', jid: 'a@g.us', numero: n, texto: 'ya', cuando: Date.now() - 10 })
  recordatorios.crear({ idBot: '5111', jid: 'a@g.us', numero: n, texto: 'otro bot', cuando: Date.now() - 10 })
  recordatorios.crear({ idBot: 'principal', jid: 'a@g.us', numero: n, texto: 'futuro', cuando: Date.now() + 99999 })
  const enviados = []
  const sock = { sendMessage: async (jid, c) => { enviados.push(c.text) } }
  assert.equal(await recordatorios.procesar(sock, 'principal'), 1)
  assert.equal(enviados.length, 1)
  assert.ok(enviados[0].includes('ya'))
  assert.equal(recordatorios.listarDe(n).length, 2)
  for (const x of recordatorios.listarDe(n)) recordatorios.borrar(n, x.id)
})

test('recordatorios: si el envío falla se conserva para reintentar', async () => {
  const n = '51900000003'
  recordatorios.crear({ idBot: 'principal', jid: 'a', numero: n, texto: 'x', cuando: Date.now() - 10 })
  const sock = { sendMessage: async () => { throw new Error('caído') } }
  const orig = console.error
  console.error = () => {}
  try { assert.equal(await recordatorios.procesar(sock, 'principal'), 0) } finally { console.error = orig }
  assert.equal(recordatorios.listarDe(n).length, 1)
  for (const x of recordatorios.listarDe(n)) recordatorios.borrar(n, x.id)
})

test('afk: avisa al mencionarlo y se quita al volver a escribir', async () => {
  afk.activar('51900000010', 'comiendo')
  const enviados = []
  const sock = { sendMessage: async (jid, c) => { enviados.push(c.text) } }
  const msg = (extra) => ({ key: { remoteJid: 'g@g.us' }, message: { extendedTextMessage: { contextInfo: extra } } })
  await afk.aplicar(sock, msg({ mentionedJid: ['51900000010@s.whatsapp.net'] }), { esGrupo: true, numeroRemitente: '51900000011', body: 'hola' })
  assert.equal(enviados.length, 1)
  assert.ok(enviados[0].includes('comiendo'))
  await afk.aplicar(sock, msg({}), { esGrupo: true, numeroRemitente: '51900000010', body: 'ya volví' })
  assert.equal(afk.obtener('51900000010'), null)
  assert.ok(enviados[1].includes('Bienvenido'))
})

test('afk: el propio comando .afk no lo desactiva', async () => {
  afk.activar('51900000012', '')
  const sock = { sendMessage: async () => {} }
  await afk.aplicar(sock, { key: { remoteJid: 'g@g.us' }, message: {} }, { esGrupo: true, numeroRemitente: '51900000012', body: '.afk dormir' })
  assert.ok(afk.obtener('51900000012'))
  afk.desactivar('51900000012')
})

test('reputación: +1, no a sí mismo, cooldown de 24 h y ranking', () => {
  const a = '51900000020', b = '51900000021'
  assert.equal(reputacion.dar(a, a).motivo, 'propio')
  const t = Date.now()
  assert.equal(reputacion.dar(a, b, t).ok, true)
  const r2 = reputacion.dar(a, b, t + 1000)
  assert.equal(r2.ok, false)
  assert.equal(r2.motivo, 'cooldown')
  assert.equal(reputacion.dar(a, b, t + reputacion.COOLDOWN_MS + 1).total, 2)
  assert.equal(reputacion.obtener(b), 2)
  assert.equal(reputacion.top(5)[0].numero, b)
})

test('alertas de red: detecta caída y recuperación, ignora al principal', () => {
  const previo = new Map([['PRINCIPAL', true], ['5111', true], ['5222', false], ['5333', true]])
  const actual = [
    { id: 'PRINCIPAL', vivo: false }, { id: '5111', vivo: false },
    { id: '5222', vivo: true }, { id: '5333', vivo: true },
  ]
  assert.deepEqual(alertas.detectarCambios(previo, actual), [
    { id: '5111', tipo: 'caido' }, { id: '5222', tipo: 'recuperado' },
  ])
  assert.ok(alertas.textoAviso({ id: '5111', tipo: 'caido' }).includes('+5111'))
})

test('comandos .recordar y .rep responden', async () => {
  const recordar = require('../modulos/utilidad/recordar')
  const rep = require('../modulos/diversion/rep')
  const enviados = []
  const sock = { sendMessage: async (jid, c) => { enviados.push(c.text) } }
  const msg = { key: { remoteJid: 'g@g.us', participant: '51900000030@s.whatsapp.net' }, message: {} }
  await recordar.execute(sock, msg, ['xx', 'algo'], { config })
  assert.ok(enviados[0].includes('No entendí'))
  await recordar.execute(sock, msg, ['10m', 'probar'], { config, esSubBot: true, subbotNumero: '5111' })
  assert.ok(enviados[1].includes('Listo'))
  const [r] = recordatorios.listarDe('51900000030')
  assert.equal(r.idBot, '5111')
  recordatorios.borrar('51900000030', r.id)
  await rep.execute(sock, msg, [], { config })
  assert.ok(enviados[2].includes('Tu reputación'))
})
