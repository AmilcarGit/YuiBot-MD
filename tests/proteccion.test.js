// Anti-llamadas y anti-privado (lib/proteccion.js + comandos).
const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('fs')
const { respaldar } = require('./_util')

const proteccion = require('../lib/proteccion')
const anticall = require('../modulos/sistema/anticall')
const antiprivado = require('../modulos/sistema/antiprivado')
const config = require('../defaults')

const { RUTA, limpiarMemoria } = proteccion._internos
const OWNER = config.OWNERS[0].numero
let restaurar

test.before(() => { restaurar = respaldar([RUTA]) })
test.after(() => restaurar())
test.beforeEach(() => {
  fs.rmSync(RUTA, { force: true })
  limpiarMemoria()
})

function crearSock() {
  const acciones = []
  return {
    acciones,
    user: { id: '51000000000:1@s.whatsapp.net' },
    async rejectCall(id, from) { acciones.push(['rechazar', id, from]) },
    async updateBlockStatus(jid, estado) { acciones.push(['bloquear', jid, estado]) },
    async sendMessage(jid, contenido) { acciones.push(['mensaje', jid, contenido.text]) },
  }
}
const llamada = (from = '51999111222@s.whatsapp.net', extra = {}) => ({ id: 'C1', from, chatId: from, status: 'offer', ...extra })
const privado = (numero, texto = 'hola') => ({ key: { remoteJid: `${numero}@s.whatsapp.net`, fromMe: false }, message: { conversation: texto } })

test('por defecto todo está apagado y la configuración es por bot', () => {
  assert.equal(proteccion.obtener('principal').anticall.activo, false)
  proteccion.actualizar('principal', 'anticall', { activo: true })
  assert.equal(proteccion.obtener('principal').anticall.activo, true)
  assert.equal(proteccion.obtener('51999000111').anticall.activo, false, 'un subbot no hereda al principal')
  assert.throws(() => proteccion.actualizar('principal', 'otra', {}), /desconocida/)
})

test('anticall apagado: no hace nada', async () => {
  const sock = crearSock()
  assert.equal(await proteccion.manejarLlamada(sock, llamada(), { config }), 'ignorada')
  assert.deepEqual(sock.acciones, [])
})

test('anticall activo: rechaza y avisa una sola vez en poco tiempo', async () => {
  proteccion.actualizar('principal', 'anticall', { activo: true })
  const sock = crearSock()
  assert.equal(await proteccion.manejarLlamada(sock, llamada(), { config }), 'rechazada')
  assert.equal(await proteccion.manejarLlamada(sock, llamada(), { config }), 'rechazada')
  assert.equal(sock.acciones.filter((a) => a[0] === 'rechazar').length, 2)
  assert.equal(sock.acciones.filter((a) => a[0] === 'mensaje').length, 1, 'el aviso no se repite')
})

test('anticall ignora llamadas que no son entrantes y a los owners', async () => {
  proteccion.actualizar('principal', 'anticall', { activo: true })
  const sock = crearSock()
  assert.equal(await proteccion.manejarLlamada(sock, llamada('51999111222@s.whatsapp.net', { status: 'timeout' }), { config }), 'ignorada')
  assert.equal(await proteccion.manejarLlamada(sock, llamada(`${OWNER}@s.whatsapp.net`), { config }), 'ignorada')
  assert.deepEqual(sock.acciones, [])
})

test('anticall con bloquear: bloquea a la tercera llamada', async () => {
  proteccion.actualizar('principal', 'anticall', { activo: true, bloquear: true })
  const sock = crearSock()
  for (let i = 0; i < 3; i++) await proteccion.manejarLlamada(sock, llamada(), { config })
  assert.deepEqual(sock.acciones.at(-1), ['bloquear', '51999111222@s.whatsapp.net', 'block'])
})

test('antiprivado apagado o en grupos: deja pasar', async () => {
  const sock = crearSock()
  assert.equal(await proteccion.aplicarAntiprivado(sock, privado('51999111222'), { jid: '51999111222@s.whatsapp.net', config, body: 'hola' }), false)
  proteccion.actualizar('principal', 'antiprivado', { activo: true })
  const grupo = { key: { remoteJid: '1@g.us', participant: '51999111222@s.whatsapp.net' } }
  assert.equal(await proteccion.aplicarAntiprivado(sock, grupo, { jid: '1@g.us', config, body: '.menu' }), false)
  const estado = { key: { remoteJid: 'status@broadcast' } }
  assert.equal(await proteccion.aplicarAntiprivado(sock, estado, { jid: 'status@broadcast', config, body: '' }), false)
})

test('antiprivado activo: frena a usuarios, avisa una vez y deja pasar owners y .code', async () => {
  proteccion.actualizar('principal', 'antiprivado', { activo: true })
  const sock = crearSock()
  const ctx = (numero, body) => ({ jid: `${numero}@s.whatsapp.net`, config, body })

  assert.equal(await proteccion.aplicarAntiprivado(sock, privado('51999111222'), ctx('51999111222', '.menu')), true)
  assert.equal(await proteccion.aplicarAntiprivado(sock, privado('51999111222'), ctx('51999111222', '.ping')), true)
  assert.equal(sock.acciones.filter((a) => a[0] === 'mensaje').length, 1)

  assert.equal(await proteccion.aplicarAntiprivado(sock, privado('51999111222'), ctx('51999111222', '!code')), false, '.code sigue permitido')
  assert.equal(await proteccion.aplicarAntiprivado(sock, privado(OWNER), ctx(OWNER, '.menu')), false, 'el owner pasa')
  const propio = { key: { remoteJid: '51999111222@s.whatsapp.net', fromMe: true } }
  assert.equal(await proteccion.aplicarAntiprivado(sock, propio, ctx('51999111222', '.menu')), false)
})

test('antiprivado con bloquear: bloquea tras insistir', async () => {
  proteccion.actualizar('principal', 'antiprivado', { activo: true, bloquear: true })
  const sock = crearSock()
  const ctx = { jid: '51999111222@s.whatsapp.net', config, body: 'hola' }
  for (let i = 0; i < 5; i++) await proteccion.aplicarAntiprivado(sock, privado('51999111222'), ctx)
  assert.deepEqual(sock.acciones.at(-1), ['bloquear', '51999111222@s.whatsapp.net', 'block'])
})

test('los comandos activan, configuran y validan', async () => {
  const sock = crearSock()
  const msg = { key: { remoteJid: 'x@s.whatsapp.net' } }
  const ctx = { config, esSubBot: false }
  const ejecutar = async (cmd, args) => { await cmd.execute(sock, msg, args, ctx); return sock.acciones.at(-1)[2] }

  assert.match(await ejecutar(anticall, []), /APAGADO/)
  assert.match(await ejecutar(anticall, ['on']), /activado/)
  assert.equal(proteccion.obtener('principal').anticall.activo, true)
  assert.match(await ejecutar(anticall, ['bloquear', 'on']), /activado/)
  assert.equal(proteccion.obtener('principal').anticall.bloquear, true)
  assert.match(await ejecutar(anticall, ['bloquear', 'tal']), /Usa/)
  assert.match(await ejecutar(anticall, ['mensaje', 'No', 'llames']), /actualizado/)
  assert.equal(proteccion.obtener('principal').anticall.mensaje, 'No llames')
  assert.match(await ejecutar(anticall, ['mensaje', 'x'.repeat(401)]), /muy largo/)
  assert.match(await ejecutar(anticall, ['mensaje', 'reset']), /restaurado/)
  assert.match(await ejecutar(anticall, ['raro']), /No entendí/)

  assert.match(await ejecutar(antiprivado, ['on']), /activado/)
  assert.equal(proteccion.obtener('principal').antiprivado.activo, true)
})

test('en un subbot los ajustes quedan guardados con su número', async () => {
  const sock = crearSock()
  await anticall.execute(sock, { key: { remoteJid: 'x@s.whatsapp.net' } }, ['on'], { config, esSubBot: true, subbotNumero: '51999000111' })
  assert.equal(proteccion.obtener('51999000111').anticall.activo, true)
  assert.equal(proteccion.obtener('principal').anticall.activo, false)
})

test('los comandos exigen ser dueño (subbotOwnerOnly)', () => {
  assert.equal(anticall.subbotOwnerOnly, true)
  assert.equal(antiprivado.subbotOwnerOnly, true)
})
