// Motor de estilo de Yui. Lee temas.js (cómo se ve) y voz.js (cómo habla).
// Normalmente no necesitas editar este archivo: personaliza temas.js y voz.js.
import { temas, modo, ZONA } from './temas.js'
import { voz } from './voz.js'
import { chat } from '../nucleo/memoria.js'
import { formato } from '../nucleo/utiles.js'

const azar = lista => lista[Math.floor(Math.random() * lista.length)]

// ── Letras ──────────────────────────────────────────────────────
const bases = {
  script: { A: 0x1d4d0, a: 0x1d4ea },
  negrita: { A: 0x1d400, a: 0x1d41a }
}

const mini = {
  a: 'ᴀ', b: 'ʙ', c: 'ᴄ', d: 'ᴅ', e: 'ᴇ', f: 'ꜰ', g: 'ɢ', h: 'ʜ', i: 'ɪ', j: 'ᴊ', k: 'ᴋ', l: 'ʟ', m: 'ᴍ',
  n: 'ɴ', o: 'ᴏ', p: 'ᴘ', q: 'ǫ', r: 'ʀ', s: 'ꜱ', t: 'ᴛ', u: 'ᴜ', v: 'ᴠ', w: 'ᴡ', x: 'x', y: 'ʏ', z: 'ᴢ'
}

const sinTildes = texto => texto
  .replace(/ñ/g, '\u0001').replace(/Ñ/g, '\u0002')
  .normalize('NFD').replace(/[̀-ͯ]/g, '')
  .replace(/\u0001/g, 'ñ').replace(/\u0002/g, 'Ñ')

export function fuente(texto, tipo) {
  if (!tipo) return `*${texto}*`
  return [...sinTildes(String(texto))].map(c => {
    if (tipo === 'mini') return mini[c.toLowerCase()] || c
    const base = bases[tipo]
    if (!base) return c
    if (c >= 'A' && c <= 'Z') return String.fromCodePoint(base.A + c.charCodeAt(0) - 65)
    if (c >= 'a' && c <= 'z') return String.fromCodePoint(base.a + c.charCodeAt(0) - 97)
    return c
  }).join('')
}

// ── Festividad activa ───────────────────────────────────────────
const dentro = (hoy, { desde, hasta }) =>
  desde <= hasta ? hoy >= desde && hoy <= hasta : hoy >= desde || hoy <= hasta

function hoyEnZona(fecha) {
  const partes = new Intl.DateTimeFormat('en-US', { timeZone: ZONA, month: '2-digit', day: '2-digit' })
    .formatToParts(fecha)
  const valor = tipo => partes.find(p => p.type === tipo).value
  return `${valor('month')}-${valor('day')}`
}

export function temaPara(eleccion, fecha = new Date()) {
  if (eleccion && eleccion !== 'auto' && temas[eleccion]) return temas[eleccion]
  if (eleccion && eleccion !== 'auto') return temas.normal
  const hoy = hoyEnZona(fecha)
  const clave = Object.keys(temas).find(k => temas[k].fechas && dentro(hoy, temas[k].fechas))
  return temas[clave] || temas.normal
}

export const modoActual = () => chat('_global').tema || modo()
export const temaActivo = () => temaPara(modoActual())

// ── Frases ──────────────────────────────────────────────────────
export function dice(clave, datos = {}) {
  const propia = temaActivo().voz?.[clave]
  const lista = propia?.length ? propia : voz[clave]
  if (!lista?.length) return clave
  return azar(lista).replace(/\{(\w+)\}/g, (hueco, k) => (datos[k] ?? hueco))
}

// ── Piezas visuales ─────────────────────────────────────────────
const emojis = () => temaActivo().emojis

export const ok = texto => `${emojis().ok} ${texto}`
export const mal = texto => `${emojis().error} ${texto}`
export const aviso = texto => `${emojis().aviso} ${texto}`
export const dinero = n => `${emojis().dinero} ${formato(n)}`
export const adorno = () => azar(temaActivo().adornos)
export const firma = () => temaActivo().firma
export const nieve = () => temaActivo().nieve

export function caja(titulo, filas = [], { emoji } = {}) {
  const t = temaActivo()
  const icono = emoji || t.emojis.titulo
  const cabeza = `${t.marco.cabeza[0]}${icono} ${fuente(titulo, t.fuente)} ${icono}${t.marco.cabeza[1]}`
  const cuerpo = filas
    .flat()
    .filter(f => f !== null && f !== undefined && f !== false)
    .flatMap(f => String(f).split('\n'))
    .map(f => `${t.marco.lado}${f}`)
  return [cabeza, ...cuerpo, t.marco.pie].join('\n')
}
