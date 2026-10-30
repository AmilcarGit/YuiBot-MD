// Mejoras de trabajos, ranking y logros nuevos.
const test = require('node:test')
const assert = require('node:assert/strict')
const path = require('path')
const { respaldar } = require('./_util')

const restaurar = respaldar([path.join(__dirname, '..', 'data', 'usuarios.json'), path.join(__dirname, '..', 'data', 'trabajos.json')])
test.after(() => restaurar())

const config = require('../defaults')
const db = require('../lib/db')
const T = require('../lib/trabajos')
const logros = require('../lib/logros')
const P = config.PREFIXES[0]

let contador = 0
const nuevoNumero = () => `5191${String(++contador).padStart(7, '0')}`
const fijo = (...v) => { let i = 0; return () => v[Math.min(i++, v.length - 1)] }
const msg = (n) => ({ key: { remoteJid: 'g@g.us', participant: `${n}@s.whatsapp.net` }, message: { conversation: '.x' } })
const crearSock = () => { const e = []; return { e, sendMessage: async (j, c, o) => { e.push({ j, ...c, o }); return {} } } }
const plano = (t) => Array.from(String(t), (ch) => { const c = ch.codePointAt(0); if (c >= 0x1d5d4 && c <= 0x1d5ed) return String.fromCharCode(65 + c - 0x1d5d4); if (c >= 0x1d5ee && c <= 0x1d607) return String.fromCharCode(97 + c - 0x1d5ee); if (c >= 0x1d7ec && c <= 0x1d7f5) return String.fromCharCode(48 + c - 0x1d7ec); return ch }).join('')
const cmd = (n) => require(`../modulos/diversion/${n}`)

test('comprar mejoras: cobra, sube de nivel y respeta máximo y saldo', () => {
  const n = nuevoNumero()
  assert.equal(T.comprarMejora(n, 'nada').motivo, 'clave')
  db.guardarUsuario(n, { monedas: 100 })
  const falta = T.comprarMejora(n, 'pico')
  assert.deepEqual([falta.ok, falta.motivo, falta.faltan], [false, 'saldo', 300])
  assert.equal(T.nivelMejora(n, 'pico'), 0)
  db.guardarUsuario(n, { monedas: 400 })
  const r = T.comprarMejora(n, 'pico')
  assert.deepEqual([r.ok, r.nivel, r.costo, r.saldo], [true, 1, 400, 0])
  assert.equal(T.precioSiguiente(n, 'pico'), 900)
  db.guardarUsuario(n, { monedas: 1e7 })
  for (let i = 0; i < 4; i++) assert.ok(T.comprarMejora(n, 'pico').ok)
  assert.equal(T.nivelMejora(n, 'pico'), 5)
  assert.equal(T.comprarMejora(n, 'pico').motivo, 'max')
  assert.equal(T.precioSiguiente(n, 'pico'), null)
  assert.equal(db.obtenerUsuario(n).mejorasTotal, 5, 'se copia al usuario para los logros')
})

test('bono de pago, reloj, abogado, parcelas y abono', () => {
  const n = nuevoNumero()
  db.guardarUsuario(n, { monedas: 1e7 })
  const base = { ganancia: 100, filas: [] }
  assert.equal(T.conMejoras(n, 'minar', base).ganancia, 100, 'sin mejora no cambia')
  T.comprarMejora(n, 'pico'); T.comprarMejora(n, 'pico')
  const m = T.conMejoras(n, 'minar', base)
  assert.equal(m.ganancia, 116)
  assert.ok(m.filas.at(-1)[1].includes('+16 %'))
  assert.equal(T.conMejoras(n, 'pescar', base).ganancia, 100, 'solo mejora su trabajo')
  assert.equal(T.conMejoras(n, 'minar', { ganancia: 0, filas: [] }).ganancia, 0)
  assert.equal(T.conMejoras(n, 'minar', { ganancia: -50, filas: [] }).ganancia, -50)

  assert.equal(T.esperaEfectiva(n, 1000), 1000)
  T.comprarMejora(n, 'reloj'); T.comprarMejora(n, 'reloj')
  assert.equal(T.esperaEfectiva(n, 1000), 900)

  const r0 = T.TRABAJOS.crimen.resolver({ rng: fijo(0.9, 0, 0), numero: n })
  T.comprarMejora(n, 'abogado')
  const r1 = T.TRABAJOS.crimen.resolver({ rng: fijo(0.9, 0, 0), numero: n })
  assert.equal(r1.ganancia, Math.round(r0.ganancia * 0.8))

  assert.equal(T.parcelasDe(n), 3)
  T.comprarMejora(n, 'parcela')
  assert.equal(T.parcelasDe(n), 4)
  assert.equal(T.estadoGranja(n).libres, 4)
  T.comprarMejora(n, 'abono')
  const p = T.plantar(n, 'papa', 4, 0)
  assert.deepEqual([p.ok, p.plantadas], [true, 4])
  assert.equal(p.tiempo, Math.round(20 * 60000 * 0.92))
  assert.equal(T.estadoGranja(n, 1).libres, 0)
})

test('el reloj acorta la espera real de un trabajo', async () => {
  const n = nuevoNumero()
  db.guardarUsuario(n, { monedas: 1e7 })
  for (let i = 0; i < 5; i++) T.comprarMejora(n, 'reloj')
  assert.equal(T.esperaEfectiva(n, 20 * 60000), 15 * 60000)
  const sock = crearSock()
  await cmd('minar').execute(sock, msg(n), [], { config })
  assert.ok(plano(sock.e[0].text).includes('Vuelve en 15 min'), sock.e[0].text)
})

test('las ganancias de un trabajo suben con la mejora y se registran', async () => {
  const n = nuevoNumero()
  db.guardarUsuario(n, { monedas: 1e7 })
  for (let i = 0; i < 5; i++) T.comprarMejora(n, 'cana')
  const sock = crearSock()
  const original = Math.random
  Math.random = () => 0 // sardina = 14
  try { await cmd('pescar').execute(sock, msg(n), [], { config }) } finally { Math.random = original }
  assert.ok(plano(sock.e[0].text).includes('+20 monedas'), sock.e[0].text) // 14 × 1.4 = 19.6 → 20
  assert.ok(plano(sock.e[0].text).includes('Caña pro'))
  const u = db.obtenerUsuario(n)
  assert.ok(u.trabajosVeces >= 1 && u.trabajosGanado > 0)
})

test('.upgrades: panel con lista, compra con botones y errores claros', async () => {
  const n = nuevoNumero()
  db.guardarUsuario(n, { monedas: 0 })
  let sock = crearSock()
  await cmd('upgrades').execute(sock, msg(n), [], { config })
  const filas = sock.e[0].buttons[0].sections[0].rows
  assert.equal(filas.length, 10)
  assert.ok(filas.every((f) => f.title.length <= 24 && f.description.length <= 72 && f.id.startsWith(`${P}upgrades comprar `)))
  sock = crearSock()
  await cmd('upgrades').execute(sock, msg(n), ['comprar', 'pico'], { config })
  assert.ok(plano(sock.e[0].text).includes('Te faltan'))
  sock = crearSock()
  await cmd('upgrades').execute(sock, msg(n), ['comprar', 'zzz'], { config })
  assert.ok(plano(sock.e[0].text).includes('No encuentro'))
  db.guardarUsuario(n, { monedas: 5000 })
  sock = crearSock()
  await cmd('upgrades').execute(sock, msg(n), ['comprar', 'Pico', 'de', 'acero'], { config })
  const t = plano(sock.e[0].text)
  assert.ok(t.includes('Mejora comprada') || t.includes('MEJORA COMPRADA'), t)
  assert.ok(t.includes('▰▱▱▱▱'))
  assert.ok(sock.e[0].buttons.some((b) => b.id === `${P}upgrades comprar pico`))
  assert.equal(T.nivelMejora(n, 'pico'), 1)
  // si la lista falla, cae a texto
  const s2 = crearSock(); const orig = s2.sendMessage
  s2.sendMessage = async (j, c, o) => { if (c.buttons) throw new Error('no'); return orig(j, c, o) }
  await cmd('upgrades').execute(s2, msg(n), [], { config })
  assert.ok(plano(s2.e[0].text).includes('MEJORAS'))
})

test('.toptrabajos ordena por ganado y .trabajos ofrece los extras', async () => {
  const a = nuevoNumero(); const b = nuevoNumero()
  T.registrar(a, 'minar', 500); T.registrar(b, 'minar', 900); T.registrar(b, 'pescar', 100)
  const top = T.topTrabajos(50)
  assert.ok(top.findIndex((u) => u.numero === b) < top.findIndex((u) => u.numero === a))
  assert.equal(top.find((u) => u.numero === b).veces, 2)
  assert.ok(T.posicionTrabajos(b) < T.posicionTrabajos(a))
  assert.equal(T.posicionTrabajos('0000'), null)
  const sock = crearSock()
  await cmd('toptrabajos').execute(sock, msg(a), [], { config })
  assert.ok(sock.e[0].text.includes(`@${b}`) && sock.e[0].mentions.includes(`${b}@s.whatsapp.net`))
  const s2 = crearSock()
  await cmd('trabajos').execute(s2, msg(a), [], { config })
  const extras = s2.e[0].buttons[0].sections[1].rows.map((r) => r.id)
  assert.deepEqual(extras, [`${P}upgrades`, `${P}toptrabajos`])
})

test('logros de trabajos y mejoras se desbloquean y pagan', () => {
  const ids = logros.LOGROS.map((l) => l.id)
  assert.equal(new Set(ids).size, ids.length)
  for (const l of logros.LOGROS) assert.ok(logros.COLORES_TIER[l.tier], l.id)
  const n = nuevoNumero()
  db.guardarUsuario(n, { monedas: 1e7 })
  assert.equal(logros.evaluar(n).length >= 0, true)
  T.registrar(n, 'minar', 10)
  assert.ok(logros.evaluar(n).some((l) => l.id === 'primer-sueldo'))
  for (const c of ['pico', 'pico', 'pico', 'pico', 'pico', 'cana', 'cana', 'cana', 'cana', 'cana']) T.comprarMejora(n, c)
  assert.ok(logros.evaluar(n).some((l) => l.id === 'equipado'))
  assert.equal(logros.evaluar(n).length, 0, 'no se repiten')
})
