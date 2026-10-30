// Reacciones de estado: ⏳ al empezar, ✅ al terminar, ❌ si falla (sin mensajes extra).
const test = require('node:test')
const assert = require('node:assert/strict')
const { iniciar, fallar, finalizar, conEstado } = require('../lib/reaccion')

const crearSock = () => { const r = []; return { r, sendMessage: async (j, c) => { r.push(c.react?.text); return {} } } }
const msg = () => ({ key: { remoteJid: 'a@s.whatsapp.net', id: 'X' } })

test('iniciar solo reacciona una vez y finalizar deja ✅', async () => {
  const s = crearSock(); const m = msg()
  await iniciar(s, m); await iniciar(s, m)
  await finalizar(s, m); await finalizar(s, m)
  assert.deepEqual(s.r, ['⏳', '✅'])
})

test('fallar deja ❌ y luego ya no pone ✅', async () => {
  const s = crearSock(); const m = msg()
  await iniciar(s, m); await fallar(s, m); await finalizar(s, m)
  assert.deepEqual(s.r, ['⏳', '❌'])
})

test('sin iniciar no reacciona nada (comandos que responden antes de trabajar)', async () => {
  const s = crearSock(); const m = msg()
  await finalizar(s, m); await fallar(s, m)
  assert.deepEqual(s.r, [])
})

test('conEstado termina en ✅, conserva el resultado y devuelve ❌ si lanza error', async () => {
  const s = crearSock(); const m = msg()
  const ok = conEstado({ name: 'x', execute: async (sock, mensaje) => { await iniciar(sock, mensaje); return 42 } })
  assert.equal(await ok.execute(s, m), 42)
  assert.deepEqual(s.r, ['⏳', '✅'])
  const s2 = crearSock(); const m2 = msg()
  const mal = conEstado({ name: 'y', execute: async (sock, mensaje) => { await iniciar(sock, mensaje); throw new Error('boom') } })
  await assert.rejects(() => mal.execute(s2, m2), /boom/)
  assert.deepEqual(s2.r, ['⏳', '❌'])
})

test('si WhatsApp rechaza la reacción el comando sigue normal', async () => {
  const s = { sendMessage: async () => { throw new Error('Connection Closed') } }
  const m = conEstado({ name: 'z', execute: async (sock, mensaje) => { await iniciar(sock, mensaje); return 'listo' } })
  assert.equal(await m.execute(s, msg()), 'listo')
})

test('los comandos de descarga viejos ya no mandan "Descargando…" como texto', () => {
  const fs = require('fs'); const path = require('path')
  const dir = path.join(__dirname, '..', 'modulos', 'download')
  for (const f of ['tiktok', 'soundcloud', 'tiktoksearch', 'instagram', 'ytmp3', 'facebook', 'yts', 'apk', 'instagramreels', 'youtube']) {
    const src = fs.readFileSync(path.join(dir, `${f}.js`), 'utf8')
    assert.ok(!/espera\(`Descargando/.test(src), f)
    assert.ok(src.includes('conEstado('), f)
  }
})
