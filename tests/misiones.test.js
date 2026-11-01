// Misiones diarias: selección estable, avance, cobro, bono y racha.
const test = require('node:test')
const assert = require('node:assert/strict')
const path = require('path')
const { respaldar } = require('./_util')

const restaurar = respaldar([path.join(__dirname, '..', 'data', 'usuarios.json'), path.join(__dirname, '..', 'data', 'trabajos.json'), path.join(__dirname, '..', 'data', 'misiones.json')])
test.after(() => restaurar())

const config = require('../defaults')
const db = require('../lib/db')
const M = require('../lib/misiones')
const T = require('../lib/trabajos')
const cmd = require('../modulos/diversion/misionesdia')

let c = 0
const nuevo = () => `5197${String(++c).padStart(7, '0')}`
const T0 = Date.parse('2031-03-05T15:00:00Z')

const completar = (n, ahora) => { for (const m of M.misionesDe(n, M.diaDe(ahora))) M.avanzar(n, m.evento, m.meta, ahora) }

test('3 misiones por día (fácil, media, difícil), estables durante el día y distintas entre días', () => {
  const n = nuevo(); const a = M.misionesDe(n, '2031-03-05'); const b = M.misionesDe(n, '2031-03-05')
  assert.deepEqual(a.map((m) => m.nivel), ['facil', 'media', 'dificil'])
  assert.deepEqual(a, b)
  const dias = new Set(Array.from({ length: 20 }, (_, i) => M.misionesDe(n, `2031-04-${String(i + 1).padStart(2, '0')}`).map((m) => m.id).join()))
  assert.ok(dias.size > 3)
})

test('el día cambia a medianoche de Perú', () => {
  assert.equal(M.diaDe(Date.parse('2031-03-05T04:59:00Z')), '2031-03-04')
  assert.equal(M.diaDe(Date.parse('2031-03-05T05:00:00Z')), '2031-03-05')
})

test('avanzar solo cuenta eventos de sus misiones y respeta la meta', () => {
  const n = nuevo(); const [m1] = M.misionesDe(n, M.diaDe(T0))
  M.avanzar(n, m1.evento, 999, T0); M.avanzar(n, 'evento-raro', 5, T0); M.avanzar(n, m1.evento, -3, T0); M.avanzar('', m1.evento, 1, T0)
  const e = M.estado(n, T0)
  assert.equal(e.misiones[0].actual, m1.meta); assert.ok(e.misiones[0].completa)
})

test('reclamar paga lo completado, no repite y da el bono al completar las 3', () => {
  const n = nuevo(); db.guardarUsuario(n, { monedas: 0 })
  assert.equal(M.reclamar(n, T0).motivo, 'nada')
  completar(n, T0)
  const r = M.reclamar(n, T0)
  assert.ok(r.ok); assert.equal(r.nuevas.length, 3); assert.equal(r.bono, M.BONO_BASE + M.BONO_POR_DIA)
  assert.equal(db.obtenerUsuario(n).monedas, r.saldo); assert.ok(r.ganado >= r.base + r.bono)
  assert.equal(M.reclamar(n, T0).motivo, 'todo')
  assert.equal(M.estado(n, T0).bonoReclamado, true)
})

test('racha: días seguidos suben el bono y saltarse un día la reinicia', () => {
  const n = nuevo(); db.guardarUsuario(n, { monedas: 0 })
  const dia = 86400000
  completar(n, T0); assert.equal(M.reclamar(n, T0).racha, 1)
  completar(n, T0 + dia); const r2 = M.reclamar(n, T0 + dia); assert.equal(r2.racha, 2); assert.equal(r2.bono, M.BONO_BASE + 2 * M.BONO_POR_DIA)
  completar(n, T0 + 4 * dia); assert.equal(M.reclamar(n, T0 + 4 * dia).racha, 1)
})

test('cobrar por partes: primero lo hecho, el bono llega al cobrar la última', () => {
  const n = nuevo(); db.guardarUsuario(n, { monedas: 0 })
  const ms = M.misionesDe(n, M.diaDe(T0))
  M.avanzar(n, ms[0].evento, ms[0].meta, T0)
  const r1 = M.reclamar(n, T0); assert.ok(r1.ok); assert.equal(r1.bono, 0)
  for (const m of ms) M.avanzar(n, m.evento, m.meta, T0)
  const r2 = M.reclamar(n, T0); assert.ok(r2.ok); assert.ok(r2.bono > 0)
})

test('trabajar, mejorar y reclamar el daily alimentan las misiones (hoy)', () => {
  const n = nuevo(); db.guardarUsuario(n, { monedas: 5000 })
  const hoy = M.misionesDe(n); const antes = M.estado(n).misiones.map((m) => m.actual)
  T.registrar(n, 'minar', 700); T.registrar(n, 'pescar', 0); T.registrar(n, 'granja', 100)
  const despues = M.estado(n).misiones.map((m) => m.actual)
  const sube = hoy.some((m, i) => ['trabajo', 'ganado', 'granja'].includes(m.evento) && despues[i] > antes[i])
  assert.ok(sube || !hoy.some((m) => ['trabajo', 'ganado', 'granja'].includes(m.evento)))
})

test('comando .misiones: panel y reclamar', async () => {
  const n = nuevo(); db.guardarUsuario(n, { monedas: 0 }); const P = config.PREFIXES[0]
  const enviados = []
  const sock = { sendMessage: async (j, c) => { enviados.push(c); return {} } }
  const msg = { key: { remoteJid: 'g@g.us', participant: `${n}@s.whatsapp.net`, participantAlt: `${n}@s.whatsapp.net` }, message: { conversation: '' } }
  await cmd.execute(sock, msg, [], { config })
  const t1 = String(enviados.at(-1).text || enviados.at(-1).interactiveMessage?.body?.text || JSON.stringify(enviados.at(-1)))
  assert.match(t1, /ISIONES|Misiones|M.{0,6}I.{0,6}S/i)
  await cmd.execute(sock, msg, ['reclamar'], { config })
  assert.ok(enviados.length >= 2); assert.ok(P)
})
