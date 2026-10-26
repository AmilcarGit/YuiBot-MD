// Matemática escolar: MCD/MCM, factorización, fracciones, ecuaciones,
// porcentajes y conversión de unidades. Todo son funciones puras.

const LIMITE_ENTERO = 1e12 // para que factorizar no tarde de más

function mcd(a, b) {
  a = Math.abs(a); b = Math.abs(b)
  while (b) [a, b] = [b, a % b]
  return a
}
const mcm = (a, b) => (a && b ? Math.abs(a * b) / mcd(a, b) : 0)

function esPrimo(n) {
  if (!Number.isInteger(n) || n < 2) return false
  if (n < 4) return true
  if (n % 2 === 0 || n % 3 === 0) return false
  for (let i = 5; i * i <= n; i += 6) if (n % i === 0 || n % (i + 2) === 0) return false
  return true
}

/** 360 → [[2,3],[3,2],[5,1]] */
function factorizar(n) {
  if (!Number.isInteger(n) || n < 2 || n > LIMITE_ENTERO) throw new Error(`Escribe un entero entre 2 y ${LIMITE_ENTERO.toExponential(0)}.`)
  const factores = []
  let resto = n
  for (let p = 2; p * p <= resto; p += p === 2 ? 1 : 2) {
    let e = 0
    while (resto % p === 0) { resto /= p; e += 1 }
    if (e) factores.push([p, e])
  }
  if (resto > 1) factores.push([resto, 1])
  return factores
}

const SUPER = { 0: '⁰', 1: '¹', 2: '²', 3: '³', 4: '⁴', 5: '⁵', 6: '⁶', 7: '⁷', 8: '⁸', 9: '⁹' }
const potencia = (e) => String(e).replace(/\d/g, (d) => SUPER[d])
const factoresATexto = (f) => f.map(([p, e]) => (e > 1 ? `${p}${potencia(e)}` : String(p))).join(' × ')

function divisores(n) {
  const lista = []
  for (let i = 1; i * i <= n; i++) if (n % i === 0) { lista.push(i); if (i !== n / i) lista.push(n / i) }
  return lista.sort((a, b) => a - b)
}

// ── Fracciones ────────────────────────────────────────────────────────
function leerFraccion(texto) {
  const m = String(texto).trim().match(/^(-?\d+)(?:\/(\d+))?$/)
  if (!m) return null
  const den = m[2] === undefined ? 1 : Number(m[2])
  if (den === 0) throw new Error('El denominador no puede ser 0.')
  return simplificar({ n: Number(m[1]), d: den })
}

function simplificar({ n, d }) {
  if (d < 0) { n = -n; d = -d }
  const g = mcd(n, d) || 1
  return { n: n / g, d: d / g }
}

function operarFracciones(a, op, b) {
  switch (op) {
    case '+': return simplificar({ n: a.n * b.d + b.n * a.d, d: a.d * b.d })
    case '-': return simplificar({ n: a.n * b.d - b.n * a.d, d: a.d * b.d })
    case '*': case 'x': return simplificar({ n: a.n * b.n, d: a.d * b.d })
    case '/': case ':':
      if (b.n === 0) throw new Error('No se puede dividir entre 0.')
      return simplificar({ n: a.n * b.d, d: a.d * b.n })
    default: throw new Error('Usa + - * /')
  }
}

const fraccionATexto = ({ n, d }) => (d === 1 ? String(n) : `${n}/${d}`)

/** 7/3 → "2 1/3" */
function mixto({ n, d }) {
  if (d === 1 || Math.abs(n) < d) return null
  const entero = Math.trunc(n / d)
  return `${entero} ${Math.abs(n % d)}/${d}`
}

// ── Ecuaciones ────────────────────────────────────────────────────────
const redondear = (x) => Math.round(x * 1e6) / 1e6

/** ax² + bx + c = 0 (si a = 0 resuelve la lineal bx + c = 0). */
function resolverEcuacion(a, b, c) {
  if (![a, b, c].every(Number.isFinite)) throw new Error('Los coeficientes deben ser números.')
  if (a === 0) {
    if (b === 0) return { tipo: c === 0 ? 'infinitas' : 'sin-solucion', raices: [] }
    return { tipo: 'lineal', raices: [redondear(-c / b)] }
  }
  const discriminante = b * b - 4 * a * c
  if (discriminante > 0) {
    const r = Math.sqrt(discriminante)
    return { tipo: 'dos-reales', discriminante, raices: [redondear((-b + r) / (2 * a)), redondear((-b - r) / (2 * a))] }
  }
  if (discriminante === 0) return { tipo: 'doble', discriminante, raices: [redondear(-b / (2 * a))] }
  const real = redondear(-b / (2 * a))
  const imag = redondear(Math.sqrt(-discriminante) / (2 * Math.abs(a)))
  return { tipo: 'complejas', discriminante, raices: [`${real} + ${imag}i`, `${real} - ${imag}i`] }
}

// ── Porcentajes ───────────────────────────────────────────────────────
const porcentajeDe = (p, total) => (p / 100) * total
const quePorcentaje = (parte, total) => (total === 0 ? null : (parte / total) * 100)
const aplicarPorcentaje = (valor, p) => valor * (1 + p / 100) // p negativo = descuento

// ── Unidades ──────────────────────────────────────────────────────────
// factor = cuántas unidades base entran en 1 de esa unidad
const MAGNITUDES = {
  longitud: { base: 'm', u: { mm: 0.001, cm: 0.01, m: 1, km: 1000, in: 0.0254, ft: 0.3048, yd: 0.9144, mi: 1609.344 } },
  masa: { base: 'kg', u: { mg: 1e-6, g: 0.001, kg: 1, t: 1000, lb: 0.45359237, oz: 0.0283495231 } },
  tiempo: { base: 's', u: { ms: 0.001, s: 1, min: 60, h: 3600, d: 86400, sem: 604800 } },
  volumen: { base: 'l', u: { ml: 0.001, l: 1, m3: 1000, gal: 3.785411784, 'fl-oz': 0.0295735296 } },
  area: { base: 'm2', u: { cm2: 0.0001, m2: 1, ha: 10000, km2: 1e6, ft2: 0.09290304 } },
  datos: { base: 'b', u: { b: 1, kb: 1024, mb: 1048576, gb: 1073741824, tb: 1099511627776 } },
}
const TEMPERATURAS = ['c', 'f', 'k']
const SINONIMOS = { l: 'l', lt: 'l', litro: 'l', litros: 'l', metro: 'm', metros: 'm', kilo: 'kg', kilos: 'kg', gramos: 'g', seg: 's', segundos: 's', minutos: 'min', hora: 'h', horas: 'h', dias: 'd', celsius: 'c', fahrenheit: 'f', kelvin: 'k', pulgadas: 'in', pies: 'ft', libras: 'lb', millas: 'mi' }

const normalizarUnidad = (u) => {
  const t = String(u || '').toLowerCase().replace(/°/g, '').replace(/²/g, '2').replace(/³/g, '3').trim()
  return SINONIMOS[t] || t
}

function aCelsius(v, u) { return u === 'c' ? v : u === 'f' ? (v - 32) * 5 / 9 : v - 273.15 }
function desdeCelsius(v, u) { return u === 'c' ? v : u === 'f' ? v * 9 / 5 + 32 : v + 273.15 }

function convertirUnidad(valor, desde, hasta) {
  const a = normalizarUnidad(desde)
  const b = normalizarUnidad(hasta)
  if (TEMPERATURAS.includes(a) && TEMPERATURAS.includes(b)) return { resultado: desdeCelsius(aCelsius(valor, a), b), desde: a, hasta: b }
  for (const mag of Object.values(MAGNITUDES)) {
    if (mag.u[a] !== undefined && mag.u[b] !== undefined) return { resultado: (valor * mag.u[a]) / mag.u[b], desde: a, hasta: b }
  }
  throw new Error(`No puedo convertir "${desde}" a "${hasta}" (deben ser del mismo tipo).`)
}

const listaUnidades = () => [
  ...Object.entries(MAGNITUDES).map(([nombre, m]) => [nombre, Object.keys(m.u)]),
  ['temperatura', ['c', 'f', 'k']],
]

module.exports = {
  mcd, mcm, esPrimo, factorizar, factoresATexto, divisores, leerFraccion, operarFracciones,
  fraccionATexto, mixto, resolverEcuacion, porcentajeDe, quePorcentaje, aplicarPorcentaje,
  convertirUnidad, listaUnidades, LIMITE_ENTERO,
}
