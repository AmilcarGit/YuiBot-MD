// Caché de grupos, límite de comandos por persona y reacciones de estado.
const test = require('node:test')
const assert = require('node:assert/strict')
const EventEmitter = require('node:events')

const { crearCacheGrupos } = require('../lib/cacheGrupos')
const { crearLimiteComandos } = require('../lib/limiteComandos')
const { reaccionar, conReaccion } = require('../lib/reaccion')

function sockFalso(buscar) {
  const sock = { ev: new EventEmitter(), llamadas: 0, groupMetadata: async (jid) => { sock.llamadas++; return buscar(jid, sock.llamadas) } }
  return sock
}

test('la caché pide los datos del grupo una sola vez mientras estén frescos', async () => {
  let reloj = 1000
  const cache = crearCacheGrupos({ ttlMs: 1000, ahora: () => reloj })
  const sock = sockFalso((jid, n) => ({ id: jid, n }))
  const cached = cache.instalar(sock)
  assert.equal((await sock.groupMetadata('a@g.us')).n, 1)
  assert.equal((await sock.groupMetadata('a@g.us')).n, 1)
  assert.equal((await cached('a@g.us')).n, 1, 'cachedGroupMetadata usa la misma caché')
  assert.equal(sock.llamadas, 1)
  reloj += 1500 // caduca
  assert.equal((await sock.groupMetadata('a@g.us')).n, 2)
  assert.equal(cache.estado().aciertos, 2)
})

test('peticiones simultáneas comparten una sola consulta', async () => {
  const cache = crearCacheGrupos()
  const sock = sockFalso(async (jid) => { await new Promise((r) => setTimeout(r, 20)); return { id: jid } })
  cache.instalar(sock)
  await Promise.all([sock.groupMetadata('a@g.us'), sock.groupMetadata('a@g.us'), sock.groupMetadata('a@g.us')])
  assert.equal(sock.llamadas, 1)
})

test('se renueva cuando alguien entra, sale o cambia el grupo', async () => {
  const cache = crearCacheGrupos()
  const sock = sockFalso((jid, n) => ({ id: jid, n }))
  cache.instalar(sock)
  await sock.groupMetadata('a@g.us'); await sock.groupMetadata('b@g.us')
  sock.ev.emit('group-participants.update', { id: 'a@g.us', participants: ['x'], action: 'add' })
  assert.equal((await sock.groupMetadata('a@g.us')).n, 3, 'a se vuelve a pedir')
  assert.equal((await sock.groupMetadata('b@g.us')).n, 2, 'b sigue en caché')
  sock.ev.emit('groups.update', [{ id: 'b@g.us', subject: 'nuevo' }])
  assert.equal((await sock.groupMetadata('b@g.us')).n, 4)
  sock.ev.emit('groups.upsert', [{ id: 'c@g.us', subject: 'c' }])
  assert.equal((await sock.groupMetadata('c@g.us')).subject, 'c')
  assert.equal(sock.llamadas, 4)
})

test('si WhatsApp falla se usa la copia vieja, y si no hay copia se propaga el error', async () => {
  let reloj = 0
  const cache = crearCacheGrupos({ ttlMs: 100, vidaMaxMs: 10000, ahora: () => reloj })
  let falla = false
  const sock = sockFalso(() => { if (falla) throw new Error('missing <group> node'); return { id: 'a', n: 1 } })
  const cached = cache.instalar(sock)
  await sock.groupMetadata('a@g.us')
  reloj = 500; falla = true
  assert.equal((await sock.groupMetadata('a@g.us')).n, 1, 'rescatada')
  assert.equal(cache.estado().rescatados, 1)
  await assert.rejects(sock.groupMetadata('nuevo@g.us'), /missing/)
  assert.equal(await cached('nuevo@g.us'), undefined, 'cachedGroupMetadata nunca lanza: Baileys lo pide por su cuenta')
  reloj = 20000 // demasiado vieja
  await assert.rejects(sock.groupMetadata('a@g.us'), /missing/)
})

test('límite de comandos: ventana, repetidos, aviso único y owners exentos', () => {
  const lim = crearLimiteComandos()
  const cfg = { MAX: 3, VENTANA_MS: 10000, AVISO_MS: 30000 }
  let t = 1000000
  const probar = (cmd = 'ping', args = '', extra = {}) => lim.revisar('51900', cmd, args, { config: cfg, ahora: t, ...extra })
  for (let i = 0; i < 3; i++) { const r = probar(`c${i}`); assert.ok(r.ok); r.liberar() }
  const cuarto = probar('c4')
  assert.deepEqual([cuarto.ok, cuarto.motivo, cuarto.avisar], [false, 'rapido', true])
  assert.equal(probar('c5').avisar, false, 'el aviso sale una sola vez')
  assert.ok(probar('c6', '', { eximir: true }).ok, 'owner sin límite')
  t += 11000 // pasó la ventana
  const r = probar('c7'); assert.ok(r.ok); r.liberar()
  t += 31000
  for (let i = 0; i < 3; i++) probar(`d${i}`).liberar?.()
  assert.equal(probar('d9').avisar, true, 'pasado el tiempo se puede avisar otra vez')
})

test('un comando idéntico en curso se ignora hasta que termina; otra persona no se ve afectada', () => {
  const lim = crearLimiteComandos()
  const a = lim.revisar('1', 'dl', 'https://x.com/a', { ahora: 0 })
  assert.ok(a.ok)
  const repetido = lim.revisar('1', 'dl', 'HTTPS://x.com/a ', { ahora: 10 })
  assert.deepEqual([repetido.ok, repetido.motivo, repetido.avisar], [false, 'repetido', false])
  assert.ok(lim.revisar('2', 'dl', 'https://x.com/a', { ahora: 20 }).ok)
  assert.ok(lim.revisar('1', 'dl', 'https://x.com/otro', { ahora: 30 }).ok)
  a.liberar()
  assert.ok(lim.revisar('1', 'dl', 'https://x.com/a', { ahora: 40 }).ok)
})

test('límite apagado desde la configuración', () => {
  const lim = crearLimiteComandos()
  for (let i = 0; i < 50; i++) assert.ok(lim.revisar('1', 'ping', '', { config: { ENABLED: false }, ahora: i }).ok)
})

test('reacciones de estado: ⏳ → ✅ / ❌ y nunca rompen el comando', async () => {
  const enviados = []
  const sock = { sendMessage: async (j, c) => { enviados.push(c.react.text) } }
  const msg = { key: { remoteJid: 'g@g.us', id: 'X' } }
  assert.equal(await conReaccion(sock, msg, async () => 42), 42)
  assert.deepEqual(enviados, ['⏳', '✅'])
  enviados.length = 0
  await assert.rejects(conReaccion(sock, msg, async () => { throw new Error('boom') }), /boom/)
  assert.deepEqual(enviados, ['⏳', '❌'])
  await reaccionar({ sendMessage: async () => { throw new Error('sin conexión') } }, msg, '⏳') // no lanza
})

test('la configuración trae el límite de comandos y un ritmo de envío más ágil', () => {
  const config = require('../defaults')
  assert.ok(config.LIMITE_COMANDOS.ENABLED && config.LIMITE_COMANDOS.MAX >= 3)
  assert.ok(config.ANTIBAN.MIN_CHAT_MS >= 400, 'sigue habiendo un mínimo entre mensajes del mismo chat')
})
