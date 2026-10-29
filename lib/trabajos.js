// Formas de ganar monedas: trabajar, minar, pescar, cazar, granja, crimen, streamear, taxi, reciclar y limosna.
// Cada una tiene su propio tiempo de espera (guardado por persona en data/trabajos.json) y paga con el boost de
// monedas de la persona (igual que .daily). Las pérdidas (crimen) nunca dejan el saldo por debajo de 0.
const path = require('path')
const { crearAlmacenCacheado } = require('./escrituraAtomica')
const { obtenerUsuario, calcularNivel, agregarMonedas } = require('./db')
const { pagar, saldo } = require('./juegos')

const MIN = 60 * 1000
const almacen = crearAlmacenCacheado(path.join(__dirname, '..', 'data', 'trabajos.json'), () => ({ usuarios: {} }))

// ── Utilidades ────────────────────────────────────────────────────────
const entre = (a, b, rng = Math.random) => Math.floor(rng() * (b - a + 1)) + a
const elegir = (lista, rng = Math.random) => lista[Math.floor(rng() * lista.length)]

/** Elige según pesos: [[valor, peso], …] */
function sorteo(tabla, rng = Math.random) {
  const total = tabla.reduce((t, [, p]) => t + p, 0)
  let r = rng() * total
  for (const [valor, peso] of tabla) { r -= peso; if (r < 0) return valor }
  return tabla[tabla.length - 1][0]
}

function formatoTiempo(ms) {
  const s = Math.max(1, Math.ceil(ms / 1000))
  if (s < 60) return `${s} s`
  const m = Math.floor(s / 60)
  if (m < 60) return `${m} min${s % 60 ? ` ${s % 60} s` : ''}`
  return `${Math.floor(m / 60)} h ${m % 60} min`
}

const dinero = (n) => Number(n || 0).toLocaleString('es-PE')

// ── Datos por persona ─────────────────────────────────────────────────
function ficha(numero) {
  const datos = almacen.leer()
  datos.usuarios = datos.usuarios || {}
  if (!datos.usuarios[numero]) datos.usuarios[numero] = { cd: {}, veces: {}, ganado: 0, granja: [] }
  return { datos, f: datos.usuarios[numero] }
}

/** Revisa y, si toca, arranca el tiempo de espera. → { ok: true } | { ok: false, restanteMs } */
function usarCooldown(numero, clave, ms, ahora = Date.now()) {
  const { datos, f } = ficha(numero)
  const hasta = (f.cd[clave] || 0) + ms
  if (ahora < hasta) return { ok: false, restanteMs: hasta - ahora }
  f.cd[clave] = ahora
  almacen.guardar(datos)
  return { ok: true }
}

function restante(numero, clave, ms, ahora = Date.now()) {
  const { f } = ficha(numero)
  return Math.max(0, (f.cd[clave] || 0) + ms - ahora)
}

function registrar(numero, clave, ganancia) {
  const { datos, f } = ficha(numero)
  f.veces[clave] = (f.veces[clave] || 0) + 1
  if (ganancia > 0) f.ganado = (f.ganado || 0) + ganancia
  almacen.guardar(datos)
}

const nivelDe = (numero) => {
  const u = obtenerUsuario(numero)
  return Math.max(0, u?.nivel ?? calcularNivel(u?.xp || 0))
}

/** Cobra o paga el resultado de un trabajo. Devuelve { delta, saldo }: delta ya incluye el boost si ganó. */
function aplicar(numero, ganancia) {
  if (ganancia > 0) { // el boost se aplica dentro de pagar: el pago real es la diferencia de saldo
    const antes = saldo(numero)
    const r = pagar(numero, ganancia)
    return { delta: Math.max(0, r.saldo - antes), saldo: r.saldo }
  }
  if (ganancia < 0) {
    const multa = Math.min(-ganancia, saldo(numero))
    return { delta: multa ? -multa : 0, saldo: agregarMonedas(numero, -multa) }
  }
  return { delta: 0, saldo: saldo(numero) }
}

// ── Los 8 trabajos de un solo comando ─────────────────────────────────
const CARRERAS = [ // desde qué nivel, nombre, pago mínimo y máximo
  [0, 'Repartidor', 40, 110, ['llevaste pedidos en bicicleta', 'repartiste volantes en el centro', 'entregaste paquetes toda la tarde']],
  [2, 'Cajero', 60, 150, ['atendiste la caja del minimarket', 'cobraste en el grifo toda la noche', 'cuadraste la caja sin faltantes']],
  [4, 'Cocinero', 90, 200, ['preparaste 40 menús del día', 'atendiste la hora punta en la cocina', 'inventaste un plato nuevo y gustó']],
  [7, 'Programador', 120, 260, ['arreglaste un bug que nadie entendía', 'entregaste un proyecto antes de tiempo', 'migraste una base de datos sin caídas']],
  [11, 'Gerente', 160, 340, ['cerraste un trato importante', 'dirigiste la reunión más larga del mes', 'aprobaste el presupuesto del año']],
]

const MINERALES = [
  [{ nombre: 'Piedra', valor: 18, icono: '🪨' }, 40], [{ nombre: 'Hierro', valor: 45, icono: '⛓️' }, 30], [{ nombre: 'Plata', valor: 85, icono: '🥈' }, 15],
  [{ nombre: 'Oro', valor: 140, icono: '🥇' }, 9], [{ nombre: 'Diamante', valor: 260, icono: '💎' }, 4], [{ nombre: 'Derrumbe', valor: 0, icono: '💥' }, 2],
]
const PECES = [
  [{ nombre: 'Sardina', valor: 14, icono: '🐟' }, 32], [{ nombre: 'Trucha', valor: 28, icono: '🐟' }, 25], [{ nombre: 'Corvina', valor: 48, icono: '🐠' }, 18],
  [{ nombre: 'Atún', valor: 75, icono: '🐟' }, 10], [{ nombre: 'Pez espada', valor: 140, icono: '🗡️' }, 4], [{ nombre: 'Cofre del fondo', valor: 220, icono: '🧰' }, 2],
  [{ nombre: 'Bota vieja', valor: 0, icono: '👢' }, 9],
]
const PRESAS = [
  [{ nombre: 'Conejo', valor: 40, icono: '🐇' }, 30], [{ nombre: 'Zorro', valor: 75, icono: '🦊' }, 22], [{ nombre: 'Venado', valor: 95, icono: '🦌' }, 18],
  [{ nombre: 'Jabalí', valor: 125, icono: '🐗' }, 12], [{ nombre: 'Oso', valor: 230, icono: '🐻' }, 4], [{ nombre: 'Se escapó', valor: 0, icono: '💨' }, 14],
]
const RECICLABLES = [
  { nombre: 'botellas', precio: 3, icono: '🍾' }, { nombre: 'latas', precio: 4, icono: '🥫' }, { nombre: 'cartón', precio: 2, icono: '📦' }, { nombre: 'cables de cobre', precio: 9, icono: '🔌' },
]

const TRABAJOS = {
  trabajar: {
    emoji: '💼', titulo: 'Trabajo', espera: 30 * MIN, aviso: 'Descansa un rato',
    resolver({ nivel, rng }) {
      const carrera = [...CARRERAS].reverse().find(([desde]) => nivel >= desde)
      const [, puesto, min, max, historias] = carrera
      const ganancia = entre(min, max, rng)
      return { ganancia, filas: [['Puesto', puesto, '🪪'], ['Hoy', elegir(historias, rng), '📝']] }
    },
  },
  minar: {
    emoji: '⛏️', titulo: 'Minería', espera: 20 * MIN, aviso: 'El pico necesita descansar',
    resolver({ rng }) {
      const mineral = sorteo(MINERALES, rng)
      if (!mineral.valor) return { ganancia: 0, filas: [['Pasó', `${mineral.icono} ${mineral.nombre}: saliste con las manos vacías`, '😵']] }
      const cantidad = entre(1, 3, rng)
      return { ganancia: mineral.valor * cantidad, filas: [['Sacaste', `${cantidad}× ${mineral.nombre} ${mineral.icono}`, '⛏️']] }
    },
  },
  pescar: {
    emoji: '🎣', titulo: 'Pesca', espera: 15 * MIN, aviso: 'Los peces ya se asustaron',
    resolver({ rng }) {
      const pez = sorteo(PECES, rng)
      if (!pez.valor) return { ganancia: 0, filas: [['Pescaste', `${pez.icono} ${pez.nombre}… no vale nada`, '😅']] }
      return { ganancia: pez.valor, filas: [['Pescaste', `${pez.nombre} ${pez.icono}`, '🎣']] }
    },
  },
  cazar: {
    emoji: '🏹', titulo: 'Cacería', espera: 25 * MIN, aviso: 'Aún no hay rastros frescos',
    resolver({ rng }) {
      const presa = sorteo(PRESAS, rng)
      if (!presa.valor) return { ganancia: 0, filas: [['Resultado', `${presa.icono} la presa ${presa.nombre.toLowerCase()}`, '😤']] }
      return { ganancia: presa.valor, filas: [['Cazaste', `${presa.nombre} ${presa.icono}`, '🏹']] }
    },
  },
  crimen: {
    emoji: '🕶️', titulo: 'Crimen', espera: 45 * MIN, aviso: 'La policía anda cerca, espera',
    resolver({ rng, numero }) {
      const exito = rng() < 0.55
      if (exito) {
        const golpe = elegir(['asaltaste un camión de golosinas', 'vaciaste una caja fuerte vieja', 'vendiste "relojes originales" en la esquina', 'ganaste una carrera clandestina'], rng)
        return { ganancia: entre(120, 380, rng), filas: [['Golpe', golpe, '🎭']] }
      }
      const multa = entre(80, 250, rng)
      const real = Math.min(multa, saldo(numero))
      const caida = elegir(['te pilló una patrulla', 'el cómplice te delató', 'la alarma sonó antes de tiempo', 'te reconoció una cámara'], rng)
      return { ganancia: -multa, filas: [['Salió mal', caida, '🚓'], ['Multa', `${dinero(real)} monedas`, '💸']] }
    },
  },
  streamear: {
    emoji: '🎥', titulo: 'Stream', espera: 40 * MIN, aviso: 'Tu comunidad necesita descansar',
    resolver({ rng }) {
      if (rng() < 0.1) return { ganancia: 0, filas: [['Directo', 'Se cayó el internet a los 5 minutos', '📡']] }
      const espectadores = Math.round(5 + rng() * rng() * 800)
      const donaciones = Math.round(espectadores * (0.05 + rng() * 0.2)) + entre(0, 30, rng)
      return { ganancia: donaciones, filas: [['Espectadores', dinero(espectadores), '👀'], ['Donaciones', `${dinero(donaciones)} monedas`, '🎁']] }
    },
  },
  reciclar: {
    emoji: '♻️', titulo: 'Reciclaje', espera: 8 * MIN, aviso: 'Ya recogiste todo por ahora',
    resolver({ rng }) {
      const item = elegir(RECICLABLES, rng)
      const kilos = entre(2, 12, rng)
      return { ganancia: kilos * item.precio, filas: [['Juntaste', `${kilos} kg de ${item.nombre} ${item.icono}`, '♻️']] }
    },
  },
  limosna: {
    emoji: '🪙', titulo: 'Limosna', espera: 5 * MIN, aviso: 'Pide con más calma',
    resolver({ rng }) {
      const r = rng()
      if (r < 0.25) return { ganancia: 0, filas: [['Hoy', 'La gente pasó de largo', '🚶']] }
      if (r > 0.92) return { ganancia: entre(60, 120, rng), filas: [['¡Suerte!', 'Un señor muy generoso te dejó un billete', '💵']] }
      return { ganancia: entre(5, 25, rng), filas: [['Hoy', elegir(['alguien te dio sencillo', 'una señora te compró un pan y monedas', 'un niño compartió su propina'], rng), '🤝']] }
    },
  },
}

// ── Taxi (con elección de ruta) ───────────────────────────────────────
const RUTAS = {
  corta: { nombre: 'Ruta corta', exito: 0.9, min: 30, max: 75, riesgo: 'Casi sin riesgo' },
  media: { nombre: 'Ruta media', exito: 0.75, min: 65, max: 150, riesgo: 'Algo de tráfico' },
  larga: { nombre: 'Ruta larga', exito: 0.55, min: 130, max: 320, riesgo: 'Mucho riesgo, gran propina' },
}
const ESPERA_TAXI = 15 * MIN

function resolverTaxi(ruta, rng = Math.random) {
  const r = RUTAS[ruta]
  if (rng() < r.exito) {
    const pasajero = elegir(['un turista perdido', 'una abuelita con compras', 'un estudiante llegando tarde', 'un chef con apuro'], rng)
    return { ganancia: entre(r.min, r.max, rng), filas: [['Ruta', r.nombre, '🗺️'], ['Pasajero', pasajero, '🧍']] }
  }
  const problema = elegir(['te quedaste en un trancón eterno', 'el pasajero se bajó sin pagar', 'se te acabó la gasolina'], rng)
  return { ganancia: 0, filas: [['Ruta', r.nombre, '🗺️'], ['Problema', problema, '🚧']] }
}

// ── Granja (se planta y se cosecha más tarde) ─────────────────────────
const PARCELAS = 3
const CULTIVOS = {
  papa: { nombre: 'Papa', icono: '🥔', tiempo: 20 * MIN, pago: 70 },
  maiz: { nombre: 'Maíz', icono: '🌽', tiempo: 30 * MIN, pago: 110 },
  tomate: { nombre: 'Tomate', icono: '🍅', tiempo: 40 * MIN, pago: 150 },
  fresa: { nombre: 'Fresa', icono: '🍓', tiempo: 60 * MIN, pago: 230 },
  cacao: { nombre: 'Cacao', icono: '🍫', tiempo: 90 * MIN, pago: 380 },
}
const sinTildes = (t) => String(t || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim()
const resolverCultivo = (t) => { const k = sinTildes(t); return CULTIVOS[k] ? k : null }

function estadoGranja(numero, ahora = Date.now()) {
  const { f } = ficha(numero)
  const lista = (f.granja || []).map((p) => ({ ...p, cultivo: CULTIVOS[p.cultivo], listo: ahora >= p.listoEn, faltaMs: Math.max(0, p.listoEn - ahora) }))
  return { parcelas: lista, libres: Math.max(0, PARCELAS - lista.length) }
}

/** Planta en `cantidad` parcelas libres (o todas si es null). */
function plantar(numero, clave, cantidad = null, ahora = Date.now()) {
  const cultivo = CULTIVOS[clave]
  if (!cultivo) return { ok: false, motivo: 'cultivo' }
  const { datos, f } = ficha(numero)
  f.granja = f.granja || []
  const libres = PARCELAS - f.granja.length
  if (libres <= 0) return { ok: false, motivo: 'llena' }
  const n = Math.min(libres, cantidad ?? libres)
  for (let i = 0; i < n; i++) f.granja.push({ cultivo: clave, listoEn: ahora + cultivo.tiempo })
  almacen.guardar(datos)
  return { ok: true, plantadas: n, cultivo, listoEn: ahora + cultivo.tiempo }
}

/** Cosecha lo que ya está listo y lo paga (±20 % por clima). */
function cosechar(numero, ahora = Date.now(), rng = Math.random) {
  const { datos, f } = ficha(numero)
  f.granja = f.granja || []
  const listas = f.granja.filter((p) => ahora >= p.listoEn)
  if (!listas.length) return { ok: false, faltan: f.granja.length ? Math.min(...f.granja.map((p) => p.listoEn - ahora)) : null }
  f.granja = f.granja.filter((p) => ahora < p.listoEn)
  almacen.guardar(datos)
  const detalle = {}
  let total = 0
  for (const p of listas) {
    const c = CULTIVOS[p.cultivo]
    total += Math.round(c.pago * (0.8 + rng() * 0.4))
    detalle[c.nombre] = { icono: c.icono, n: (detalle[c.nombre]?.n || 0) + 1 }
  }
  registrar(numero, 'granja', total)
  const cobro = aplicar(numero, total)
  return { ok: true, detalle, ganado: cobro.delta, saldo: cobro.saldo }
}

// ── Resumen para .trabajos ────────────────────────────────────────────
const LISTA_COMANDOS = [
  ['trabajar', '💼'], ['minar', '⛏️'], ['pescar', '🎣'], ['cazar', '🏹'], ['granja', '🌾'],
  ['crimen', '🕶️'], ['streamear', '🎥'], ['taxi', '🚕'], ['reciclar', '♻️'], ['limosna', '🪙'],
]

function resumen(numero, ahora = Date.now()) {
  const { f } = ficha(numero)
  const espera = { ...Object.fromEntries(Object.entries(TRABAJOS).map(([k, t]) => [k, t.espera])), taxi: ESPERA_TAXI }
  const filas = LISTA_COMANDOS.map(([nombre, emoji]) => {
    if (nombre === 'granja') {
      const g = estadoGranja(numero, ahora)
      const listas = g.parcelas.filter((p) => p.listo).length
      return { nombre, emoji, listo: listas > 0 || g.libres > 0, detalle: listas ? `${listas} para cosechar` : g.libres ? `${g.libres} parcela(s) libre(s)` : `crece ${formatoTiempo(Math.min(...g.parcelas.map((p) => p.faltaMs)))}` }
    }
    const falta = restante(numero, nombre, espera[nombre], ahora)
    return { nombre, emoji, listo: falta === 0, detalle: falta === 0 ? 'listo' : formatoTiempo(falta) }
  })
  return { filas, ganado: f.ganado || 0, veces: Object.values(f.veces || {}).reduce((a, b) => a + b, 0) }
}

module.exports = {
  TRABAJOS, RUTAS, CULTIVOS, PARCELAS, ESPERA_TAXI, LISTA_COMANDOS,
  entre, elegir, sorteo, formatoTiempo, dinero,
  usarCooldown, restante, registrar, aplicar, nivelDe, resolverTaxi, resolverCultivo,
  estadoGranja, plantar, cosechar, resumen,
}
