// Logros, racha, ranking semanal y tarjeta de perfil.
const test = require('node:test')
const assert = require('node:assert/strict')
const path = require('path')
const { respaldar } = require('./_util')

const restaurar = respaldar([path.join(__dirname, '..', 'data', 'usuarios.json')])
test.after(() => restaurar())

const db = require('../lib/db')
const logros = require('../lib/logros')
const config = require('../defaults')

const A = '51970000001', B = '51970000002'

test('claveDia/claveSemana usan hora de Perú y la semana empieza el lunes', () => {
  // 2026-10-26 es lunes. 03:00 UTC aún es domingo 25 en Perú (UTC-5).
  assert.equal(db.claveDia(Date.UTC(2026, 9, 26, 3, 0)), '2026-10-25')
  assert.equal(db.claveSemana(Date.UTC(2026, 9, 26, 3, 0)), '2026-10-19')
  assert.equal(db.claveSemana(Date.UTC(2026, 9, 26, 12, 0)), '2026-10-26')
  assert.equal(db.claveSemana(Date.UTC(2026, 9, 31, 12, 0)), '2026-10-26')
})

test('la XP lleva racha de días seguidos y XP semanal', () => {
  const r1 = db.agregarXpConCooldown(A, { COOLDOWN_MS: 0, MIN: 10, MAX: 10 })
  assert.equal(r1.xpGanado, 10)
  let u = db.obtenerUsuario(A)
  assert.equal(u.racha, 1)
  db.agregarXpConCooldown(A, { COOLDOWN_MS: 0, MIN: 10, MAX: 10 })
  u = db.obtenerUsuario(A)
  assert.equal(u.racha, 1) // mismo día no suma
  assert.equal(u.xpSemana, 20)
  assert.equal(u.mensajes, 2)

  // Ayer activo → hoy suma racha; hace 3 días → se reinicia.
  db.guardarUsuario(A, { ultimoDia: db.claveDia(Date.now() - 86400000), racha: 4, mejorRacha: 4 })
  db.agregarXpConCooldown(A, { COOLDOWN_MS: 0, MIN: 1, MAX: 1 })
  u = db.obtenerUsuario(A)
  assert.equal(u.racha, 5)
  assert.equal(u.mejorRacha, 5)
  db.guardarUsuario(A, { ultimoDia: db.claveDia(Date.now() - 3 * 86400000) })
  db.agregarXpConCooldown(A, { COOLDOWN_MS: 0, MIN: 1, MAX: 1 })
  assert.equal(db.obtenerUsuario(A).racha, 1)
  assert.equal(db.obtenerUsuario(A).mejorRacha, 5)
})

test('la XP semanal se reinicia al cambiar de semana', () => {
  db.guardarUsuario(B, { semana: '2000-01-03', xpSemana: 999 })
  db.agregarXpConCooldown(B, { COOLDOWN_MS: 0, MIN: 7, MAX: 7 })
  assert.equal(db.obtenerUsuario(B).xpSemana, 7)
})

test('evaluar desbloquea logros una sola vez y da el premio', () => {
  db.guardarUsuario(A, { mensajes: 120, monedas: 0, nivel: 0, mejorRacha: 0, reputacion: 0 })
  const nuevos = logros.evaluar(A)
  assert.deepEqual(nuevos.map((l) => l.id).sort(), ['conversador', 'primeros-pasos'])
  assert.equal(db.obtenerUsuario(A).monedas, 200) // 50 + 150
  assert.deepEqual(logros.evaluar(A), []) // no se repite
  assert.equal(db.obtenerUsuario(A).monedas, 200)
  assert.deepEqual(logros.evaluar('51999999990'), []) // usuario inexistente
})

test('progreso marca desbloqueados y limita el avance a la meta', () => {
  const p = logros.progreso({ mensajes: 5000, nivel: 3 })
  const conv = p.find((l) => l.id === 'leyenda-chat')
  assert.ok(conv.desbloqueado && conv.actual === 5000)
  const n5 = p.find((l) => l.id === 'nivel-5')
  assert.ok(!n5.desbloqueado && n5.actual === 3)
})

test('topSemanal solo cuenta la semana actual y ordena', () => {
  db.guardarUsuario(A, { semana: db.claveSemana(), xpSemana: 50 })
  db.guardarUsuario(B, { semana: db.claveSemana(), xpSemana: 90 })
  db.guardarUsuario('51970000003', { semana: '2000-01-03', xpSemana: 9999 })
  const top = logros.topSemanal(10)
  assert.equal(top[0].numero, B)
  assert.ok(!top.some((u) => u.numero === '51970000003'))
  db.guardarUsuario(A, { xp: 500 })
  db.guardarUsuario(B, { xp: 900 })
  assert.ok(logros.posicionGlobal(B) < logros.posicionGlobal(A))
})

test('los ids de logros son únicos y los tiers tienen color', () => {
  const ids = logros.LOGROS.map((l) => l.id)
  assert.equal(new Set(ids).size, ids.length)
  for (const l of logros.LOGROS) assert.ok(logros.COLORES_TIER[l.tier], l.id)
})

test('.logros y .topsemana responden', async () => {
  const enviados = []
  const sock = { sendMessage: async (j, c) => { enviados.push(c) } }
  const msg = { key: { remoteJid: 'g@g.us', participant: `${A}@s.whatsapp.net` }, message: {} }
  await require('../modulos/usuario/logros').execute(sock, msg, [], { config })
  assert.ok(enviados[0].text.includes('Desbloqueados'))
  await require('../modulos/usuario/topsemana').execute(sock, msg, [], { config })
  assert.ok(enviados[1].text.includes(B))
})

let hayCanvas = true
try { require('../lib/canvas') } catch { hayCanvas = false }

test('la tarjeta de perfil se genera como imagen (con y sin datos)', { skip: !hayCanvas && 'sin canvas instalado' }, async () => {
  const { createCanvas } = require('../lib/canvas')
  const lienzo = createCanvas(40, 40)
  lienzo.getContext('2d').fillRect(0, 0, 40, 40)
  const png = lienzo.toBuffer('image/png')
  const original = globalThis.fetch
  globalThis.fetch = async () => ({ ok: true, status: 200, arrayBuffer: async () => png })
  try {
    const { generarTarjetaPerfil } = require('../lib/perfilCard')
    const base = { numero: '51900000000', avatar: 'http://x/a.png', background: 'http://x/b.png', botName: 'YuiBot-MD' }
    const completo = await generarTarjetaPerfil({ ...base, nombre: 'Nombre muy largo '.repeat(6), nivel: 50, progreso: 10, necesario: 100, rango: 'Leyenda', posicion: 1, mensajes: 1e6, monedas: 1e7, reputacion: 3, racha: 9, insignias: Array.from({ length: 14 }, () => ({ color: '#fff' })), totalLogros: 14, logrosObtenidos: 14 })
    const vacio = await generarTarjetaPerfil({ ...base, nombre: undefined })
    for (const b of [completo, vacio]) {
      assert.ok(Buffer.isBuffer(b) && b.length > 1000)
      assert.equal(b[0], 0xff) // JPEG
    }
    // Sin red: usa fondo degradado y sigue generando.
    globalThis.fetch = async () => { throw new Error('sin red') }
    const log = console.error
    console.error = () => {}
    try { assert.ok((await generarTarjetaPerfil({ ...base, nombre: 'X' })).length > 1000) } finally { console.error = log }
  } finally { globalThis.fetch = original }
})
