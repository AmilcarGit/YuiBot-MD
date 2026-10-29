// Trabajos para ganar monedas (lógica con azar controlado y comandos de punta a punta).
const test = require('node:test')
const assert = require('node:assert/strict')
const path = require('path')
const { respaldar } = require('./_util')

const restaurar = respaldar([path.join(__dirname, '..', 'data', 'usuarios.json'), path.join(__dirname, '..', 'data', 'trabajos.json')])
test.after(() => restaurar())

const config = require('../defaults')
const db = require('../lib/db')
const T = require('../lib/trabajos')
const P = config.PREFIXES[0]

const fijo = (...valores) => { let i = 0; return () => valores[Math.min(i++, valores.length - 1)] }
const sinNegrita = (t) => Array.from(String(t), (ch) => {
  const c = ch.codePointAt(0)
  if (c >= 0x1d5d4 && c <= 0x1d5ed) return String.fromCharCode(65 + c - 0x1d5d4)
  if (c >= 0x1d5ee && c <= 0x1d607) return String.fromCharCode(97 + c - 0x1d5ee)
  if (c >= 0x1d7ec && c <= 0x1d7f5) return String.fromCharCode(48 + c - 0x1d7ec)
  return ch
}).join('')
let contador = 0
const nuevoNumero = () => `5190${String(++contador).padStart(7, '0')}`
const msg = (numero, jid = 'g@g.us') => ({ key: { remoteJid: jid, participant: `${numero}@s.whatsapp.net` }, message: { conversation: '.x' } })
function crearSock() {
  const enviados = []
  return { enviados, sendMessage: async (j, c, o) => { enviados.push({ j, ...c, o }); return {} } }
}
const textoDe = (e) => sinNegrita(e.text || '')
const cmd = (n) => require(`../modulos/diversion/${n}`)

test('utilidades: sorteo por pesos, rangos y formato de tiempo', () => {
  assert.equal(T.sorteo([['a', 1], ['b', 1]], fijo(0.1)), 'a')
  assert.equal(T.sorteo([['a', 1], ['b', 1]], fijo(0.9)), 'b')
  assert.equal(T.entre(5, 10, fijo(0)), 5)
  assert.equal(T.entre(5, 10, fijo(0.999)), 10)
  assert.equal(T.formatoTiempo(45 * 1000), '45 s')
  assert.equal(T.formatoTiempo(90 * 1000), '1 min 30 s')
  assert.equal(T.formatoTiempo(95 * 60 * 1000), '1 h 35 min')
})

test('trabajar: el puesto sube con el nivel y paga dentro de su rango', () => {
  const r0 = T.TRABAJOS.trabajar.resolver({ nivel: 0, rng: fijo(0, 0) })
  assert.ok(r0.filas[0][1] === 'Repartidor' && r0.ganancia === 40)
  const r12 = T.TRABAJOS.trabajar.resolver({ nivel: 12, rng: fijo(0.999, 0) })
  assert.ok(r12.filas[0][1] === 'Gerente' && r12.ganancia === 340)
  assert.equal(T.TRABAJOS.trabajar.resolver({ nivel: 5, rng: fijo(0, 0) }).filas[0][1], 'Cocinero')
})

test('minar, pescar, cazar: premios y resultados vacíos', () => {
  const buena = T.TRABAJOS.minar.resolver({ rng: fijo(0.999 * 0 + 0.97, 0.5) }) // zona alta de la tabla
  assert.ok(buena.ganancia >= 0)
  assert.equal(T.TRABAJOS.minar.resolver({ rng: fijo(0.999) }).ganancia, 0, 'derrumbe')
  assert.equal(T.TRABAJOS.pescar.resolver({ rng: fijo(0.999) }).ganancia, 0, 'bota vieja')
  assert.equal(T.TRABAJOS.pescar.resolver({ rng: fijo(0) }).ganancia, 14, 'sardina')
  assert.equal(T.TRABAJOS.cazar.resolver({ rng: fijo(0.999) }).ganancia, 0, 'se escapó')
  assert.equal(T.TRABAJOS.cazar.resolver({ rng: fijo(0) }).ganancia, 40, 'conejo')
  assert.equal(T.TRABAJOS.minar.resolver({ rng: fijo(0, 0.999) }).ganancia, 18 * 3, 'piedra × 3')
})

test('crimen: gana o paga una multa que nunca supera tu saldo', () => {
  const n = nuevoNumero()
  const ok = T.TRABAJOS.crimen.resolver({ rng: fijo(0.1, 0), numero: n })
  assert.ok(ok.ganancia >= 120 && ok.ganancia <= 380)
  const mal = T.TRABAJOS.crimen.resolver({ rng: fijo(0.9, 0.5, 0), numero: n })
  assert.ok(mal.ganancia < 0)
  assert.ok(mal.filas.some((f) => f[0] === 'Multa'))
  db.guardarUsuario(n, { monedas: 30 })
  const cobro = T.aplicar(n, -200)
  assert.deepEqual([cobro.delta, cobro.saldo], [-30, 0], 'solo pierde lo que tiene')
  assert.deepEqual([T.aplicar(n, -50).delta, T.aplicar(n, -50).saldo], [0, 0], 'sin saldo no hay multa')
})

test('streamear, reciclar y limosna', () => {
  assert.equal(T.TRABAJOS.streamear.resolver({ rng: fijo(0.05) }).ganancia, 0, 'se cayó el internet')
  const stream = T.TRABAJOS.streamear.resolver({ rng: fijo(0.5, 0.5, 0.5, 0.5, 0.5) })
  assert.ok(stream.ganancia > 0 && stream.filas.length === 2)
  const rec = T.TRABAJOS.reciclar.resolver({ rng: fijo(0, 0) })
  assert.equal(rec.ganancia, 2 * 3, '2 kg de botellas × 3')
  assert.equal(T.TRABAJOS.limosna.resolver({ rng: fijo(0.1) }).ganancia, 0)
  assert.ok(T.TRABAJOS.limosna.resolver({ rng: fijo(0.5, 0.5, 0.5) }).ganancia >= 5)
  const premio = T.TRABAJOS.limosna.resolver({ rng: fijo(0.95, 0.5) })
  assert.ok(premio.ganancia >= 60)
})

test('taxi: cada ruta paga en su rango o falla sin cobrar', () => {
  assert.ok(T.resolverTaxi('corta', fijo(0.1, 0)).ganancia >= 30)
  assert.equal(T.resolverTaxi('larga', fijo(0.99, 0)).ganancia, 0)
  const larga = T.resolverTaxi('larga', fijo(0.1, 0.999))
  assert.equal(larga.ganancia, 320)
})

test('los tiempos de espera funcionan por persona y por trabajo', () => {
  const a = nuevoNumero(); const b = nuevoNumero()
  assert.ok(T.usarCooldown(a, 'minar', 1000, 5000).ok)
  const otra = T.usarCooldown(a, 'minar', 1000, 5400)
  assert.deepEqual([otra.ok, otra.restanteMs], [false, 600])
  assert.ok(T.usarCooldown(a, 'pescar', 1000, 5400).ok, 'otro trabajo no se bloquea')
  assert.ok(T.usarCooldown(b, 'minar', 1000, 5400).ok, 'otra persona tampoco')
  assert.ok(T.usarCooldown(a, 'minar', 1000, 6001).ok, 'pasado el tiempo vuelve')
})

test('granja: plantar, esperar, cosechar y pagar; parcelas limitadas', () => {
  const n = nuevoNumero()
  const t0 = 1_000_000
  assert.equal(T.plantar(n, 'oro').motivo, 'cultivo')
  const r = T.plantar(n, 'papa', 2, t0)
  assert.deepEqual([r.ok, r.plantadas], [true, 2])
  assert.equal(T.plantar(n, 'maiz', null, t0).plantadas, 1, 'queda 1 libre')
  assert.equal(T.plantar(n, 'maiz', null, t0).motivo, 'llena')
  const g = T.estadoGranja(n, t0 + 1000)
  assert.deepEqual([g.parcelas.length, g.libres, g.parcelas[0].listo], [3, 0, false])

  const temprano = T.cosechar(n, t0 + 5 * 60000)
  assert.equal(temprano.ok, false)
  assert.equal(temprano.faltan, 15 * 60000)

  db.guardarUsuario(n, { monedas: 0 })
  const a = T.cosechar(n, t0 + 21 * 60000, fijo(0.5)) // las 2 papas (20 min)
  assert.ok(a.ok && a.detalle.Papa.n === 2)
  assert.equal(a.ganado, 140, '2 × 70, sin variación con 0.5')
  assert.equal(T.estadoGranja(n, t0 + 21 * 60000).libres, 2)
  const b = T.cosechar(n, t0 + 31 * 60000, fijo(0.5)) // el maíz (30 min)
  assert.equal(b.ganado, 110)
  assert.equal(T.cosechar(n, t0 + 99 * 60000).faltan, null, 'ya no queda nada plantado')
})

test('.trabajar paga, guarda el tiempo de espera y avisa si repites', async () => {
  const n = nuevoNumero()
  const sock = crearSock()
  await cmd('trabajar').execute(sock, msg(n), [], { config })
  const t1 = textoDe(sock.enviados[0])
  assert.ok(t1.includes('Repartidor') && /\+\d/.test(t1), t1)
  assert.ok(db.obtenerUsuario(n).monedas >= 40)
  assert.ok(sock.enviados[0].buttons.some((b) => b.id === `${P}trabajos`))
  await cmd('trabajar').execute(sock, msg(n), [], { config })
  assert.ok(textoDe(sock.enviados[1]).includes('Vuelve en'))
  assert.equal(T.resumen(n).veces, 1, 'solo cuenta el que se hizo')
})

test('los 8 comandos simples responden y cobran con boost', async () => {
  for (const nombre of ['minar', 'pescar', 'cazar', 'crimen', 'streamear', 'reciclar', 'limosna']) {
    const n = nuevoNumero()
    db.guardarUsuario(n, { monedas: 1000 })
    const sock = crearSock()
    await cmd(nombre).execute(sock, msg(n), [], { config })
    assert.equal(sock.enviados.length, 1, nombre)
    assert.ok(textoDe(sock.enviados[0]).includes('Saldo'), nombre)
  }
  const n = nuevoNumero()
  db.guardarUsuario(n, { boostMonedas: { multiplicador: 2, expira: Date.now() + 60000 }, monedas: 0 })
  const r = T.aplicar(n, 100)
  assert.equal(r.delta, 200, 'el boost duplica lo ganado')
})

test('.taxi muestra rutas con botones y luego maneja', async () => {
  const n = nuevoNumero()
  const sock = crearSock()
  await cmd('taxi').execute(sock, msg(n), [], { config })
  assert.deepEqual(sock.enviados[0].buttons.map((b) => b.id), [`${P}taxi corta`, `${P}taxi media`, `${P}taxi larga`])
  await cmd('taxi').execute(sock, msg(n), ['media'], { config })
  assert.ok(textoDe(sock.enviados[1]).includes('Ruta media'))
  await cmd('taxi').execute(sock, msg(n), ['media'], { config })
  assert.ok(textoDe(sock.enviados[2]).includes('taller'))
})

test('.granja: estado, plantar, error de cultivo y cosecha anticipada', async () => {
  const n = nuevoNumero()
  const sock = crearSock()
  const ejecutar = (...args) => cmd('granja').execute(sock, msg(n), args, { config })
  await ejecutar()
  assert.ok(textoDe(sock.enviados[0]).includes('libre'))
  await ejecutar('plantar')
  assert.ok(textoDe(sock.enviados[1]).includes('Elige qué plantar'))
  await ejecutar('plantar', 'fresa')
  assert.ok(textoDe(sock.enviados[2]).includes('Fresa'))
  await ejecutar('plantar', 'papa')
  assert.ok(textoDe(sock.enviados[3]).includes('ocupadas'))
  await ejecutar('cosechar')
  assert.ok(textoDe(sock.enviados[4]).includes('Aún no está listo'))
  const vacio = nuevoNumero()
  const s2 = crearSock()
  await cmd('granja').execute(s2, msg(vacio), ['cosechar'], { config })
  assert.ok(textoDe(s2.enviados[0]).includes('nada plantado'))
})

test('.trabajos lista los 10 con su estado, en lista desplegable', async () => {
  const n = nuevoNumero()
  const sock = crearSock()
  await cmd('minar').execute(crearSock(), msg(n), [], { config })
  await cmd('trabajos').execute(sock, msg(n), [], { config })
  const filas = sock.enviados[0].buttons[0].sections[0].rows
  assert.equal(filas.length, 10)
  assert.ok(filas.find((f) => f.id === `${P}minar`).description.startsWith('⏳'))
  assert.ok(filas.find((f) => f.id === `${P}pescar`).description.startsWith('✅'))
  assert.ok(filas.every((f) => f.title.length <= 24 && f.description.length <= 72))
  // si WhatsApp rechaza la lista cae a texto
  const sock2 = crearSock()
  const original = sock2.sendMessage
  sock2.sendMessage = async (j, c, o) => { if (c.buttons) throw new Error('no'); return original(j, c, o) }
  await cmd('trabajos').execute(sock2, msg(n), [], { config })
  assert.ok(textoDe(sock2.enviados[0]).includes('GANAR MONEDAS'))
})
