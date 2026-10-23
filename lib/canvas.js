// Adaptador de canvas — un solo punto de entrada para createCanvas / loadImage.
//
// Por qué existe: el paquete "canvas" (node-canvas 2.x) necesita compilarse
// con cairo/pango y NO trae binarios para Android/Termux ni para Node muy
// nuevos (error "Cannot find module '../build/Release/canvas.node'").
// "@napi-rs/canvas" trae binarios ya compilados (incluido android-arm64) y
// tiene casi la misma API, así que se usa primero. Si no está instalado,
// se intenta "canvas" como respaldo para no romper instalaciones viejas.
//
// Única diferencia que se normaliza acá: toBuffer('image/jpeg', { quality: 0.9 })
// (node-canvas, 0 a 1, objeto) vs toBuffer('image/jpeg', 90) (napi-rs, 0 a 100).
// Así ningún comando tiene que cambiar su forma de llamar a toBuffer.

let lib
let esNapi = false

try {
  lib = require('@napi-rs/canvas')
  esNapi = true
} catch (errorNapi) {
  try {
    lib = require('canvas')
  } catch (errorCanvas) {
    const error = new Error(
      'No hay ninguna librería de canvas instalada. Ejecuta: npm install @napi-rs/canvas\n' +
      `  (@napi-rs/canvas: ${errorNapi.message.split('\n')[0]})\n` +
      `  (canvas: ${errorCanvas.message.split('\n')[0]})`
    )
    error.code = 'CANVAS_NO_DISPONIBLE'
    throw error
  }
}

function calidadNapi(opciones) {
  const valor = opciones && typeof opciones === 'object' ? opciones.quality : opciones
  if (typeof valor !== 'number' || Number.isNaN(valor)) return 92
  const porcentaje = valor <= 1 ? valor * 100 : valor
  return Math.min(100, Math.max(1, Math.round(porcentaje)))
}

function createCanvas(ancho, alto, ...resto) {
  const canvas = lib.createCanvas(ancho, alto, ...resto)

  if (esNapi) {
    const toBufferOriginal = canvas.toBuffer.bind(canvas)
    canvas.toBuffer = (mime = 'image/png', opciones) => {
      if (mime === 'image/jpeg' || mime === 'image/webp') {
        return toBufferOriginal(mime, calidadNapi(opciones))
      }
      return toBufferOriginal(mime)
    }
  }

  return canvas
}

const loadImage = (...args) => lib.loadImage(...args)

module.exports = { createCanvas, loadImage, esNapi, calidadNapi }
