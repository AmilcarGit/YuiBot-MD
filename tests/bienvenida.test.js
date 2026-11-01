// Pantalla de bienvenida: se adapta a cualquier tamaño de terminal y nunca rompe el arranque.
const test = require('node:test')
const assert = require('node:assert/strict')
const B = require('../lib/bienvenida')

const datos = { nombre: 'YuiBot-MD', version: '1.0.0', prefijos: ['!', '.', '/', '#'], sinPrefijo: true, comandos: 233, ia: false, node: 'v22.0.0' }
const tamanos = [[200, 60], [120, 40], [100, 30], [80, 24], [74, 24], [64, 20], [58, 16], [50, 30], [44, 24], [40, 20], [36, 22], [32, 16], [30, 12], [24, 10], [20, 8], [10, 4]]

test('cabe en cualquier pantalla (ancho y alto) con y sin color', () => {
  for (const [columnas, filas] of tamanos) for (const color of [true, false]) {
    const { lineas } = B.construirPantalla({ columnas, filas, color, datos })
    assert.ok(Math.max(...lineas.map(B.largo)) <= Math.max(columnas, 1) , `ancho ${columnas}x${filas}`)
    if (columnas >= 24 && filas >= 10) assert.ok(lineas.length <= filas, `alto ${columnas}x${filas}`)
  }
})

test('pantallas grandes usan la flor grande y las chicas bajan de tamaño', () => {
  const radio = (c, f) => B.construirPantalla({ columnas: c, filas: f, datos }).diseno?.radio ?? 0
  assert.equal(radio(120, 40), 7)
  assert.ok(radio(60, 24) < radio(120, 40))
  assert.ok(radio(40, 22) <= radio(60, 24))
  assert.equal(radio(10, 4), 0, 'muy pequeña: solo texto')
})

test('mismo alto en todas las fases de la floración (para poder redibujar en el sitio)', () => {
  for (const [c, f] of [[120, 40], [60, 24], [40, 22]]) {
    const altos = new Set(B.FASES.map((t) => B.construirPantalla({ columnas: c, filas: f, t, datos }).lineas.length))
    assert.equal(altos.size, 1, `${c}x${f}`)
  }
})

test('la flor crece con t y deja de ser un capullo', () => {
  const pixeles = (t) => B.dibujarFlor({ radio: 6, t }).flat().filter((p) => p.c != null).length
  assert.ok(pixeles(0.12) < pixeles(0.5) && pixeles(0.5) < pixeles(1))
})

test('sin color no hay códigos ANSI', () => {
  const { lineas } = B.construirPantalla({ columnas: 100, filas: 30, color: false, datos })
  assert.ok(!lineas.join('').includes('\x1b'))
  assert.ok(lineas.join('\n').includes('233'))
})

function salidaFalsa({ tty = true, columns = 100, rows = 30 } = {}) {
  const partes = []
  return { isTTY: tty, columns, rows, write: (t) => { partes.push(String(t)); return true }, texto: () => partes.join('') }
}

test('mostrar: animado en terminal con color, estático si no es terminal o se pide sin animación', async () => {
  const a = salidaFalsa(); const r = await B.mostrar({ datos, salida: a, pausa: 0, env: {} })
  assert.equal(r.animado, true); assert.ok(a.texto().includes('\x1b[?25l') && a.texto().includes('\x1b[?25h'), 'oculta y devuelve el cursor')
  const b = salidaFalsa({ tty: false }); assert.equal((await B.mostrar({ datos, salida: b, env: {} })).animado, false); assert.ok(!b.texto().includes('\x1b'))
  const c = salidaFalsa(); assert.equal((await B.mostrar({ datos, salida: c, env: { NO_COLOR: '1' } })).animado, false); assert.ok(!c.texto().includes('\x1b'))
  const d = salidaFalsa(); assert.equal((await B.mostrar({ datos, salida: d, env: { YUI_SIN_ANIMACION: '1' } })).animado, false)
  const e = salidaFalsa(); assert.equal((await B.mostrar({ datos, salida: e, animado: false, env: {} })).animado, false)
})

test('mostrar nunca lanza aunque la salida falle', async () => {
  const mala = { isTTY: true, columns: 80, rows: 24, write: () => { throw new Error('boom') } }
  await assert.doesNotReject(() => B.mostrar({ datos, salida: mala, pausa: 0, env: {} }))
})
