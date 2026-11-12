const test = require('node:test')
const assert = require('node:assert/strict')
const tema = require('../lib/tema')
const e = require('../lib/estilo')

test.afterEach(() => tema.forzar(null))

test('temporada: navidad del 1 de diciembre al 6 de enero (hora de Perú)', () => {
  const peru = (iso) => Date.parse(`${iso}-05:00`)
  const enNav = (iso) => tema.enTemporada(tema.TEMPORADAS.navidad, peru(iso))
  assert.equal(enNav('2026-11-30T23:59:00'), false)
  assert.equal(enNav('2026-12-01T00:00:00'), true)
  assert.equal(enNav('2026-12-25T12:00:00'), true)
  assert.equal(enNav('2027-01-06T23:59:00'), true)
  assert.equal(enNav('2027-01-07T00:00:00'), false)
  assert.equal(enNav('2026-07-15T12:00:00'), false)
})

test('forzado, caja y lista cambian con el tema', () => {
  tema.forzar('normal')
  const n = e.caja('🎵', 'x', [['A', '1'], ['B', '2']])
  assert.match(n, /^╭━━━〔/); assert.match(n, /┃ ✦ /); assert.match(e.lista(['a']), /^✦ a/)

  tema.forzar('navidad')
  const c = e.caja('🎵', 'x', [['A', '1'], ['B', '2'], ['C', '3', '📍']])
  const l = c.split('\n')
  assert.match(l[0], /^╭🎄━━〔 🎵 /); assert.match(l[0], /〕━━❄️$/)
  assert.match(l[1], /^┃ ❄️ /); assert.match(l[2], /^┃ ⭐ /)
  assert.match(l[3], /^┃ 📍 /, 'los iconos propios de cada comando se respetan')
  assert.match(l.find((x) => x.startsWith('╰')), /^╰━━🎅/)
  assert.match(e.lista(['a', 'b']), /^❄️ a\n⭐ b/)
  assert.equal(tema.adorno(), '🎄')
})

test('fijarModo valida y la prioridad es forzado > entorno', () => {
  assert.throws(() => tema.fijarModo('pascua'), /desconocido/)
  tema.forzar('navidad')
  assert.equal(tema.activo(), 'navidad')
})

test('navidad: estados, frases, letras cursivas y cuenta regresiva', () => {
  tema.forzar('navidad')
  assert.equal(tema.estado('exito'), '🎁'); assert.equal(tema.estado('error'), '❌')
  assert.match(e.exito('ok'), /^🎁 ok/); assert.match(e.espera('x'), /^🦌 /)
  assert.equal(e.negrita('Hola 1'), '𝓗𝓸𝓵𝓪 𝟭')
  assert.match(e.caja('🎵', 't', [['A', '1']]), /\n> .+$/, 'sin pie propio lleva una frase navideña')
  assert.match(e.caja('🎵', 't', [['A', '1']], 'mi pie'), /\n> mi pie$/)
  const dia = (iso) => Date.parse(`${iso}-05:00`)
  assert.match(tema.cuentaRegresiva(dia('2026-12-20T12:00:00')), /Faltan \*5\* días para Navidad/)
  assert.match(tema.cuentaRegresiva(dia('2026-12-24T12:00:00')), /Faltan \*1\* día para/)
  assert.match(tema.cuentaRegresiva(dia('2026-12-25T12:00:00')), /Hoy es Navidad/)
  assert.match(tema.cuentaRegresiva(dia('2026-12-26T12:00:00')), /Faltan \*364\* días/)
  tema.forzar('normal')
  assert.equal(tema.cuentaRegresiva(), ''); assert.equal(e.negrita('Hola'), '𝗛𝗼𝗹𝗮'); assert.equal(e.exito('ok'), '✅ ok')
  assert.doesNotMatch(e.caja('🎵', 't', [['A', '1']]), />/)
})

test('un archivo tema.json sin "fijado" (valor por omisión) no manda sobre defaults.js', () => {
  tema.forzar(null)
  const antes = process.env.YUI_TEMA; delete process.env.YUI_TEMA
  try { assert.ok(tema.MODOS.includes(tema.modo())) } finally { if (antes !== undefined) process.env.YUI_TEMA = antes }
})
