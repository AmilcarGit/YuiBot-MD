// Cola de envío anti-ban (lib/colaEnvio.js).
const test = require('node:test')
const assert = require('node:assert/strict')
const { crearColaEnvio } = require('../lib/colaEnvio')

function crearSock(retardoMs = 0) {
  const marcas = []
  return {
    marcas,
    async sendMessage(jid, contenido) {
      marcas.push({ jid, texto: contenido.text, hora: Date.now() })
      if (retardoMs) await new Promise((r) => setTimeout(r, retardoMs))
      if (contenido.fallar) throw new Error('falló')
      return { key: { id: contenido.text } }
    },
  }
}

const rapido = { MIN_CHAT_MS: 60, JITTER_MS: 0, MIN_GLOBAL_MS: 15, MAX_COLA_CHAT: 5, TIMEOUT_ENVIO_MS: 0 }

test('mantiene el orden y espacia los mensajes del mismo chat', async () => {
  const cola = crearColaEnvio(rapido)
  const sock = cola.envolver(crearSock())
  await Promise.all(['a', 'b', 'c'].map((t) => sock.sendMessage('chat1', { text: t })))
  const m = sock.marcas
  assert.deepEqual(m.map((x) => x.texto), ['a', 'b', 'c'])
  assert.ok(m[1].hora - m[0].hora >= 55, 'separación entre a y b')
  assert.ok(m[2].hora - m[1].hora >= 55, 'separación entre b y c')
})

test('devuelve lo mismo que sendMessage y propaga los errores', async () => {
  const sock = crearColaEnvio(rapido).envolver(crearSock())
  assert.deepEqual(await sock.sendMessage('c', { text: 'ok' }), { key: { id: 'ok' } })
  await assert.rejects(sock.sendMessage('c', { text: 'mal', fallar: true }), /falló/)
  assert.deepEqual(await sock.sendMessage('c', { text: 'sigue' }), { key: { id: 'sigue' } })
})

test('chats distintos no se esperan entre sí, pero sí se espacian globalmente', async () => {
  const sock = crearColaEnvio({ ...rapido, MIN_CHAT_MS: 500, MIN_GLOBAL_MS: 30 }).envolver(crearSock())
  const inicio = Date.now()
  await Promise.all([sock.sendMessage('x', { text: '1' }), sock.sendMessage('y', { text: '2' }), sock.sendMessage('z', { text: '3' })])
  assert.ok(Date.now() - inicio < 400, 'no esperan los 500 ms del otro chat')
  const horas = sock.marcas.map((m) => m.hora)
  assert.ok(horas[1] - horas[0] >= 25 && horas[2] - horas[1] >= 25, 'separación global')
})

test('rechaza cuando la cola de un chat se llena', async () => {
  const sock = crearColaEnvio({ ...rapido, MAX_COLA_CHAT: 2, MIN_CHAT_MS: 100 }).envolver(crearSock())
  const envios = Array.from({ length: 5 }, (_, i) => sock.sendMessage('c', { text: String(i) }).then(() => 'ok', (e) => e.message))
  const resultados = await Promise.all(envios)
  assert.ok(resultados.some((r) => /Cola de envío llena/.test(r)))
  assert.ok(resultados.filter((r) => r === 'ok').length >= 2)
})

test('un envío colgado se descarta y no bloquea el chat', async () => {
  const sock = crearSock()
  sock.sendMessage = async (jid, c) => (c.colgar ? new Promise(() => {}) : { key: { id: c.text } })
  const envuelto = crearColaEnvio({ ...rapido, TIMEOUT_ENVIO_MS: 80 }).envolver(sock)
  const colgado = envuelto.sendMessage('c', { text: 'x', colgar: true }).then(() => 'ok', (e) => e.message)
  const siguiente = envuelto.sendMessage('c', { text: 'y' })
  assert.match(await colgado, /no respondió/)
  assert.deepEqual(await siguiente, { key: { id: 'y' } })
})

test('sendMessageDirecto se salta la cola y ENABLED=false no cambia nada', async () => {
  const sock = crearColaEnvio(rapido).envolver(crearSock())
  const t0 = Date.now()
  await sock.sendMessageDirecto('c', { text: '1' })
  await sock.sendMessageDirecto('c', { text: '2' })
  assert.ok(Date.now() - t0 < 50)

  const original = crearSock()
  const envuelto = crearColaEnvio({ ENABLED: false }).envolver(original)
  assert.equal(envuelto, original)
  assert.equal(envuelto.sendMessageDirecto, undefined)
})

test('estado() resume lo enviado', async () => {
  const cola = crearColaEnvio(rapido)
  const sock = cola.envolver(crearSock())
  await sock.sendMessage('c', { text: 'a' })
  await sock.sendMessage('c', { text: 'b', fallar: true }).catch(() => {})
  const e = cola.estado()
  assert.deepEqual([e.enviados, e.fallidos, e.enEspera], [1, 1, 0])
})

test('envolver dos veces el mismo sock no duplica la cola', () => {
  const cola = crearColaEnvio(rapido)
  const sock = crearSock()
  cola.envolver(sock)
  const primero = sock.sendMessage
  cola.envolver(sock)
  assert.equal(sock.sendMessage, primero)
})

test('la configuración por defecto activa la despedida y la cola anti-ban', () => {
  const config = require('../defaults')
  assert.equal(config.BYE_ENABLED, true)
  assert.equal(config.ANTIBAN.ENABLED, true)
  assert.ok(config.ANTIBAN.MIN_CHAT_MS >= 500)
})
