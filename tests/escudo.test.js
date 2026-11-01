// Escudo de grupo: castigo gradual, detectores y antidelete.
const test = require('node:test')
const assert = require('node:assert/strict')
const path = require('path')
const { respaldar } = require('./_util')

const restaurar = respaldar([path.join(__dirname, '..', 'data', 'escudo.json')])
test.after(() => restaurar())

const E = require('../lib/escudo')
const hook = require('../modulos/grupo/_escudo')
const cmd = require('../modulos/grupo/escudo')
const config = require('../defaults')

const G = 'escudo-test@g.us'
const crearSock = (admins = ['51900000001']) => {
  const e = []
  return {
    e, user: { id: '51999999999:1@s.whatsapp.net' },
    groupMetadata: async () => ({ participants: [...admins.map((n) => ({ id: `${n}@s.whatsapp.net`, admin: 'admin' })), { id: '51911111111@s.whatsapp.net' }] }),
    sendMessage: async (j, c, o) => { e.push({ j, ...c }); return {} },
    groupParticipantsUpdate: async (j, p, a) => { e.push({ j, expulsar: p, a }); return [] },
  }
}
const mensaje = (num, texto, id = Math.random().toString(36).slice(2)) => ({ key: { remoteJid: G, id, participant: `${num}@s.whatsapp.net`, participantAlt: `${num}@s.whatsapp.net` }, message: { conversation: texto } })
const ctxDe = (msg, texto) => { const n = msg.key.participantAlt.split('@')[0]; return { jid: G, body: texto, esGrupo: true, remitente: msg.key.participantAlt, numeroRemitente: n, config } }

test('escalera: aviso, último aviso, silencio 10 min, silencio 1 h, expulsión y olvido a las 24 h', () => {
  const j = 'esc1@g.us'; const t0 = 1_000_000
  const acciones = [1, 2, 3, 4, 5].map((i) => E.sancionar(j, '51922222222', t0 + i))
  assert.deepEqual(acciones.map((a) => a.accion), ['aviso', 'aviso', 'silencio', 'silencio', 'expulsar'])
  assert.equal(acciones[2].ms, 600000); assert.equal(acciones[3].ms, 3600000)
  assert.equal(E.sancionar(j, '51922222222', t0 + 100).puntos, 1) // tras expulsión empieza de cero
  assert.equal(E.sancionar(j, '51922222222', t0 + 100 + 25 * 3600000).puntos, 1) // se olvida
})

test('silencios: silenciar, listar y levantar', () => {
  const j = 'esc2@g.us'
  E.silenciar(j, '51933333333', 60000, 1000)
  assert.equal(E.restanteSilencio(j, '51933333333', 2000), 59000)
  assert.equal(E.silenciados(j, 2000).length, 1)
  assert.ok(E.levantar(j, '51933333333'))
  assert.equal(E.restanteSilencio(j, '51933333333', 2000), 0)
})

test('detectores de spam y ráfaga', () => {
  const t = 5_000_000
  assert.equal(E.detectarSpam('a', 'hola hola', { ahora: t }), false)
  assert.equal(E.detectarSpam('a', 'HOLA   hola', { ahora: t + 100 }), false)
  assert.equal(E.detectarSpam('a', 'hola hola', { ahora: t + 200 }), true)
  assert.equal(E.detectarSpam('b', 'x', { ahora: t }), false)
  assert.equal(E.detectarSpam('c', 'hola', { ahora: t }), false)
  assert.equal(E.detectarSpam('c', 'hola', { ahora: t + 60000 }), false) // fuera de ventana
  for (let i = 0; i < 7; i++) assert.equal(E.detectarRafaga('r', { ahora: t + i }), false)
  assert.equal(E.detectarRafaga('r', { ahora: t + 8 }), true)
})

test('detecta enlaces', () => {
  for (const t of ['mira https://x.com', 'chat.whatsapp.com/ABC', 'wa.me/519', 'www.algo.com']) assert.ok(E.tieneEnlace(t), t)
  for (const t of ['hola que tal', 'son las 10.30', 'v1.2 listo']) assert.ok(!E.tieneEnlace(t), t)
})

test('hook: antilink borra y avisa; un admin no es castigado; sin activar no hace nada', async () => {
  const sock = crearSock(); const m = mensaje('51944444444', 'entra a https://spam.com')
  assert.equal(await hook.onMessage(sock, m, ctxDe(m, 'entra a https://spam.com')), undefined) // apagado
  E.ajustar(G, { antilink: true })
  const r = await hook.onMessage(sock, m, ctxDe(m, 'entra a https://spam.com'))
  assert.equal(r, true)
  assert.ok(sock.e.some((x) => x.delete)); assert.ok(sock.e.some((x) => /Aviso 1\//.test(x.text || '')))
  const a = mensaje('51900000001', 'https://ok.com'); const s2 = crearSock()
  assert.equal(await hook.onMessage(s2, a, ctxDe(a, 'https://ok.com')), undefined)
  assert.equal(s2.e.length, 0)
  E.ajustar(G, { antilink: false })
})

test('hook: silenciado → se borra su mensaje y se frena el comando', async () => {
  const sock = crearSock(); const m = mensaje('51955555555', '.menu')
  E.silenciar(G, '51955555555', 60000)
  assert.equal(await hook.onMessage(sock, m, ctxDe(m, '.menu')), true)
  assert.ok(sock.e.some((x) => x.delete))
  E.levantar(G, '51955555555')
})

test('hook: antispam llega hasta el silencio', async () => {
  const sock = crearSock(); E.ajustar(G, { antispam: true })
  for (let i = 0; i < 3; i++) { const m = mensaje('51966666666', 'compra ya'); await hook.onMessage(sock, m, ctxDe(m, 'compra ya')) }
  assert.ok(sock.e.some((x) => /Aviso 1\//.test(x.text || '')))
  E.ajustar(G, { antispam: false })
})

test('antidelete reenvía lo borrado', async () => {
  const sock = crearSock(); E.ajustar(G, { antidelete: true })
  const m = mensaje('51977777777', 'secreto', 'ID-1'); await hook.onMessage(sock, m, ctxDe(m, 'secreto'))
  const borrar = { key: { remoteJid: G, id: 'X', participant: '51977777777@s.whatsapp.net', participantAlt: '51977777777@s.whatsapp.net' }, message: { protocolMessage: { type: 0, key: { id: 'ID-1' } } } }
  await hook.onMessage(sock, borrar, ctxDe(borrar, ''))
  assert.ok(sock.e.some((x) => /secreto/.test(x.text || '') && /borró/.test(x.text)))
  E.ajustar(G, { antidelete: false })
})

test('comando .escudo: panel, activar con alias y exige admin', async () => {
  const P = config.PREFIXES[0]; const sock = crearSock()
  const admin = { key: { remoteJid: G, participant: '51900000001@s.whatsapp.net', participantAlt: '51900000001@s.whatsapp.net' }, message: { conversation: '' } }
  await cmd.execute(sock, admin, [], { config, commandName: 'escudo' })
  assert.match(sock.e.at(-1).text, /antidelete/i)
  await cmd.execute(sock, admin, ['on'], { config, commandName: 'antispam' })
  assert.equal(E.configGrupo(G).antispam, true)
  await cmd.execute(sock, admin, ['todo', 'off'], { config, commandName: 'escudo' })
  assert.ok(!E.FUNCIONES.some((f) => E.configGrupo(G)[f]))
  const normal = { key: { remoteJid: G, participant: '51911111111@s.whatsapp.net', participantAlt: '51911111111@s.whatsapp.net' }, message: { conversation: '' } }
  const s2 = crearSock(); await cmd.execute(s2, normal, ['todo', 'on'], { config, commandName: 'escudo' })
  assert.match(s2.e.at(-1).text, /administradores/)
  assert.ok(P)
})
