const test = require('node:test')
const assert = require('node:assert/strict')
const e = require('../lib/estilo')

test('negrita y versalitas', () => {
  assert.equal(e.negrita('Hola 1'), '𝗛𝗼𝗹𝗮 𝟭')
  assert.equal(e.negrita('é!'), 'é!')
  assert.equal(e.versalitas('Hola'), 'ʜᴏʟᴀ')
})

test('caja arma título, filas (omite vacías) y pie', () => {
  const t = e.caja('🎵', 'canción', [['Canal', 'YuiBot'], ['Vacío', ''], null, 'texto suelto'], 'pie')
  const lineas = t.split('\n')
  assert.ok(lineas[0].startsWith('╭━━━〔 🎵 ') && lineas[0].endsWith('〕━━━⬣'))
  assert.ok(lineas[0].includes('𝗖𝗔𝗡𝗖𝗜𝗢́𝗡') || lineas[0].includes('𝗖𝗔𝗡𝗖𝗜Ó𝗡'))
  assert.equal(lineas[1], '┃ ✦ 𝗖𝗮𝗻𝗮𝗹: YuiBot')
  assert.equal(lineas[2], '┃ texto suelto')
  assert.ok(lineas[3].startsWith('╰'))
  assert.equal(lineas[4], '> pie')
})

test('uso, lista y estados', () => {
  assert.ok(e.uso('.', 'tts', 'hola').includes('📌'))
  assert.equal(e.lista(['a', 'b'], { numerada: true }), '1. a\n2. b')
  assert.ok(e.error('x').startsWith('❌') && e.exito('x').startsWith('✅'))
})

test('caja pone el borde en cada línea de una fila multilínea', () => {
  const t = e.caja('📖', 'x', ['uno\n   dos\ntres'])
  assert.deepEqual(t.split('\n').slice(1, 4), ['┃ uno', '┃    dos', '┃ tres'])
})
