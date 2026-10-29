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

const path = require('path')
const fs = require('fs')

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

// ── Fuentes propias ──────────────────────────────────────────────────────
// Las imágenes pedían "sans-serif", que en Termux casi no existe: salían letras faltantes o cuadros.
// Se incluyen fuentes en assets/fonts y se registran aquí. FAMILIA es la cadena que se usa en su lugar:
// primero Poppins (texto) y, para lo que Poppins no tiene (✦ ▰ ⚔ ♡ ↻ …), DejaVu Sans.
const CARPETA_FUENTES = path.join(__dirname, '..', 'assets', 'fonts')
const FUENTES = [
  ['Poppins-Regular.ttf', 'YuiSans', 'normal', 'normal'],
  ['Poppins-Bold.ttf', 'YuiSans', 'bold', 'normal'],
  ['Poppins-Italic.ttf', 'YuiSans', 'normal', 'italic'],
  ['Poppins-BoldItalic.ttf', 'YuiSans', 'bold', 'italic'],
  ['DejaVuSans.ttf', 'YuiSimbolos', 'normal', 'normal'],
  ['DejaVuSans-Bold.ttf', 'YuiSimbolos', 'bold', 'normal'],
]
const FAMILIA = 'YuiSans, YuiSimbolos, sans-serif'
let fuentesRegistradas = 0

function registrarFuentes() {
  for (const [archivo, familia, peso, estilo] of FUENTES) {
    const ruta = path.join(CARPETA_FUENTES, archivo)
    if (!fs.existsSync(ruta)) continue
    try {
      if (esNapi) { if (typeof lib.GlobalFonts?.registerFromPath === 'function' && lib.GlobalFonts.registerFromPath(ruta, familia)) fuentesRegistradas++ }
      else if (lib.registerFont) { lib.registerFont(ruta, { family: familia, weight: peso, style: estilo }); fuentesRegistradas++ }
    } catch (error) {
      console.error(`[CANVAS] No se pudo registrar la fuente ${archivo}:`, error.message)
    }
  }
}
registrarFuentes()

// Los emojis a color NO se dibujan bien en canvas (salen como cuadros, incluso donde hay fuente de emojis,
// y en Termux no hay ninguna). Por eso se quitan del texto al dibujar; los símbolos que DejaVu sí tiene se conservan.
const SIMBOLOS_QUE_SE_DIBUJAN = '✦▰▱⚔⚡↻♡★☆♥♦♠♣✓✔✖'
const RE_EMOJI = /[\p{Extended_Pictographic}\u{1F1E6}-\u{1F1FF}\u{1F3FB}-\u{1F3FF}\uFE0F\u200D\u20E3]/gu

/** Quita los emojis que no se podrían dibujar (deja los símbolos que DejaVu sí tiene). */
function sinEmoji(texto) {
  return String(texto).replace(RE_EMOJI, (c) => (SIMBOLOS_QUE_SE_DIBUJAN.includes(c) ? c : '')).replace(/ {2,}/g, ' ').replace(/^ +/, '')
}

// Emoji de título → símbolo que sí se dibuja (DejaVu). Lo que no esté aquí usa ✦.
const SIMBOLO_DE_ICONO = {
  '🎲': '♦', '🃏': '♠', '🎰': '♣', '⚔': '⚔', '🏆': '★', '⭐': '★', '🏅': '★', '💎': '◆', '💰': '$', '🪙': '$', '💸': '$', '🤑': '$',
  '👑': '★', '🛡': '◈', '🔥': '✹', '💖': '♥', '❤': '♥', '👹': '✖', '💣': '✹', '🚫': '✖', '🔒': '◈', '🎁': '✚', '🌱': '✦', '🧠': '✦',
}

/** Insignia redonda con un símbolo, en lugar del emoji grande (que no se puede dibujar). `x,y` = esquina superior izquierda. */
function dibujarIcono(ctx, icono, x, y, tamano = 100, { color = '#d9b3ff', fondo = 'rgba(217,179,255,0.14)' } = {}) {
  const limpio = String(icono || '').replace(/[\uFE0F\u200D]/g, '')
  const simbolo = SIMBOLO_DE_ICONO[limpio] || SIMBOLO_DE_ICONO[[...limpio][0]] || '✦'
  const r = tamano / 2
  ctx.save()
  ctx.beginPath(); ctx.arc(x + r, y + r, r, 0, Math.PI * 2)
  ctx.fillStyle = fondo; ctx.fill()
  ctx.lineWidth = Math.max(2, tamano / 28); ctx.strokeStyle = color; ctx.stroke()
  ctx.fillStyle = color
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
  ctx.font = `bold ${Math.round(tamano * 0.52)}px sans-serif`
  ctx.fillText(simbolo, x + r, y + r + tamano * 0.03)
  ctx.restore()
}

function descriptorDe(objeto, nombre) {
  for (let o = objeto; o; o = Object.getPrototypeOf(o)) {
    const d = Object.getOwnPropertyDescriptor(o, nombre)
    if (d) return d
  }
  return null
}

/** Hace que el código existente use las fuentes incluidas sin cambiarlo: 'bold 26px sans-serif' → 'bold 26px YuiSans, …'. */
function prepararContexto(ctx, escala = 1) {
  if (fuentesRegistradas) {
    const d = descriptorDe(ctx, 'font')
    if (d?.set && d?.get) {
      Object.defineProperty(ctx, 'font', {
        configurable: true,
        get: () => d.get.call(ctx),
        set: (valor) => d.set.call(ctx, String(valor).replace(/\b(?:sans-serif|serif)\s*$/i, FAMILIA)),
      })
    }
  }
  {
    for (const metodo of ['fillText', 'strokeText']) {
      const original = ctx[metodo]?.bind(ctx)
      if (original) ctx[metodo] = (texto, ...resto) => original(sinEmoji(texto), ...resto)
    }
    const medir = ctx.measureText?.bind(ctx)
    if (medir) ctx.measureText = (texto) => medir(sinEmoji(texto))
  }
  if (escala !== 1) ctx.scale(escala, escala)
  try { ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high' } catch { /* no es crítico */ }
  return ctx
}

function calidadNapi(opciones) {
  const valor = opciones && typeof opciones === 'object' ? opciones.quality : opciones
  if (typeof valor !== 'number' || Number.isNaN(valor)) return 92
  const porcentaje = valor <= 1 ? valor * 100 : valor
  return Math.min(100, Math.max(1, Math.round(porcentaje)))
}

function createCanvas(ancho, alto, ...resto) {
  return envolver(lib.createCanvas(ancho, alto, ...resto), 1)
}

/**
 * Lienzo "HD": se dibuja con las mismas coordenadas de siempre pero la imagen sale con `escala` veces más
 * píxeles (por defecto 2×). El texto y los bordes quedan nítidos, no borrosos.
 */
function createCanvasHD(ancho, alto, escala = 2) {
  return envolver(lib.createCanvas(Math.round(ancho * escala), Math.round(alto * escala)), escala)
}

function envolver(canvas, escala) {
  if (typeof canvas.getContext === 'function') {
    const getContextOriginal = canvas.getContext.bind(canvas)
    let ctx2d = null
    canvas.getContext = (tipo, ...args) => {
      if (tipo !== '2d') return getContextOriginal(tipo, ...args)
      if (!ctx2d) ctx2d = prepararContexto(getContextOriginal('2d', ...args), escala)
      return ctx2d
    }
  }

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

module.exports = { createCanvas, createCanvasHD, dibujarIcono, loadImage, esNapi, calidadNapi, FAMILIA, sinEmoji, fuentesRegistradas: () => fuentesRegistradas }
