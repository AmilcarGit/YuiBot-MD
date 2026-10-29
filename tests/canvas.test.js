// Adaptador de canvas (lib/canvas.js): @napi-rs/canvas con respaldo a "canvas".
const test = require('node:test')
const assert = require('node:assert/strict')
const Module = require('module')

const RUTA = require.resolve('../lib/canvas')

function falso(nombre, llamadas) {
  return {
    createCanvas: () => ({ toBuffer: (...args) => { llamadas.push([nombre, ...args]); return Buffer.from('x') } }),
    loadImage: async (origen) => ({ origen }),
  }
}

// Carga lib/canvas.js simulando qué librerías hay instaladas.
function cargar({ napi, viejo }, llamadas = []) {
  const original = Module._load
  Module._load = function (peticion, ...resto) {
    if (peticion === '@napi-rs/canvas') {
      if (napi) return { ...falso('napi', llamadas), GlobalFonts: {} }
      throw Object.assign(new Error("Cannot find module '@napi-rs/canvas'"), { code: 'MODULE_NOT_FOUND' })
    }
    if (peticion === 'canvas') {
      if (viejo) return falso('canvas', llamadas)
      throw Object.assign(new Error("Cannot find module 'canvas'"), { code: 'MODULE_NOT_FOUND' })
    }
    return original.call(this, peticion, ...resto)
  }
  delete require.cache[RUTA]
  try {
    return require(RUTA)
  } finally {
    Module._load = original
  }
}

test('con @napi-rs/canvas, la calidad {quality: 0..1} se convierte a porcentaje', () => {
  const llamadas = []
  const { createCanvas, esNapi } = cargar({ napi: true }, llamadas)
  assert.equal(esNapi, true)
  const canvas = createCanvas(10, 10)

  canvas.toBuffer('image/jpeg', { quality: 0.93 })
  assert.equal(llamadas.at(-1)[2], 93)
  canvas.toBuffer('image/jpeg', { quality: 0.92 })
  assert.equal(llamadas.at(-1)[2], 92)
  canvas.toBuffer('image/jpeg', 80)
  assert.equal(llamadas.at(-1)[2], 80)
})

test('jpeg sin opciones usa 92 y png no recibe calidad', () => {
  const llamadas = []
  const canvas = cargar({ napi: true }, llamadas).createCanvas(10, 10)

  canvas.toBuffer('image/jpeg')
  assert.equal(llamadas.at(-1)[2], 92)
  canvas.toBuffer('image/png')
  assert.deepEqual(llamadas.at(-1), ['napi', 'image/png'])
  canvas.toBuffer()
  assert.deepEqual(llamadas.at(-1), ['napi', 'image/png'])
})

test('calidadNapi limita el rango y tolera valores raros', () => {
  const { calidadNapi } = cargar({ napi: true })
  assert.equal(calidadNapi({ quality: 1 }), 100)
  assert.equal(calidadNapi({ quality: 250 }), 100)
  assert.equal(calidadNapi({ quality: 0 }), 1)
  assert.equal(calidadNapi({ quality: 'x' }), 92)
  assert.equal(calidadNapi(null), 92)
})

test('si no está @napi-rs/canvas, cae a "canvas" y no altera las opciones', () => {
  const llamadas = []
  const lib = cargar({ napi: false, viejo: true }, llamadas)
  assert.equal(lib.esNapi, false)
  lib.createCanvas(10, 10).toBuffer('image/jpeg', { quality: 0.93 })
  assert.equal(llamadas.at(-1)[0], 'canvas')
  assert.deepEqual(llamadas.at(-1)[2], { quality: 0.93 })
})

test('sin ninguna librería instalada el error dice cómo arreglarlo', () => {
  assert.throws(
    () => cargar({ napi: false, viejo: false }),
    (error) => error.code === 'CANVAS_NO_DISPONIBLE' && /npm install @napi-rs\/canvas/.test(error.message)
  )
})

// ── Fuentes propias, emojis y lienzo HD (con la librería real si está disponible) ──
const fs = require('fs')
const path = require('path')

test('las fuentes incluidas existen en assets/fonts', () => {
  for (const f of ['Poppins-Regular.ttf', 'Poppins-Bold.ttf', 'Poppins-Italic.ttf', 'Poppins-BoldItalic.ttf', 'DejaVuSans.ttf', 'DejaVuSans-Bold.ttf']) {
    assert.ok(fs.statSync(path.join(__dirname, '..', 'assets', 'fonts', f)).size > 50000, f)
  }
})

test('sinEmoji quita emojis a color pero conserva letras, acentos y símbolos que sí se dibujan', () => {
  const { sinEmoji } = cargar({ napi: true })
  assert.equal(sinEmoji('🍃 YuiBot-MD'), 'YuiBot-MD')
  assert.equal(sinEmoji('Amílcar 🔥 Peña ✨'), 'Amílcar Peña ')
  assert.equal(sinEmoji('✦ Nivel ▰▰▱ ⚔ ♡'), '✦ Nivel ▰▰▱ ⚔ ♡')
  assert.equal(sinEmoji('👨‍👩‍👧 familia 🇵🇪'), ' familia '.replace(/^ /, ''))
})

test('createCanvasHD duplica los píxeles y pide fuentes propias; el texto sin emojis', () => {
  let real
  try { real = require('/opt/npm-tools/node_modules/@napi-rs/canvas') } catch { return } // sin la librería real, se omite
  const original = Module._load
  Module._load = function (peticion, ...resto) { return peticion === '@napi-rs/canvas' ? real : original.call(this, peticion, ...resto) }
  let lienzo
  try { delete require.cache[RUTA]; lienzo = require('../lib/canvas') } finally { Module._load = original; delete require.cache[RUTA] }
  const hd = lienzo.createCanvasHD(300, 100)
  assert.equal(hd.width, 600)
  assert.equal(hd.height, 200)
  const ctx = hd.getContext('2d')
  assert.equal(hd.getContext('2d'), ctx, 'mismo contexto en cada llamada')
  ctx.font = 'bold 20px sans-serif'
  assert.ok(ctx.font.includes('YuiSans'), ctx.font)
  assert.equal(ctx.measureText('🍃 Hola').width, ctx.measureText('Hola').width, 'los emojis no cuentan')
  assert.equal(lienzo.createCanvas(50, 40).width, 50, 'createCanvas sigue a tamaño real')
})

test('dibujarIcono usa un símbolo dibujable y nunca el emoji', () => {
  const { dibujarIcono } = cargar({ napi: true })
  const textos = []
  const ctx = { save() {}, restore() {}, beginPath() {}, arc() {}, fill() {}, stroke() {}, fillText: (t) => textos.push(t) }
  dibujarIcono(ctx, '🎲', 0, 0, 100)
  dibujarIcono(ctx, '⚔️', 0, 0, 100)
  dibujarIcono(ctx, '🦄', 0, 0, 100) // desconocido → ✦
  assert.deepEqual(textos, ['♦', '⚔', '✦'])
})
