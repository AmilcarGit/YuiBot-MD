const test = require('node:test')
const assert = require('node:assert/strict')
const tts = require('../lib/tts')

const audio = Buffer.alloc(500, 1)
function stubFetch(fn) {
  const original = globalThis.fetch
  globalThis.fetch = fn
  return () => { globalThis.fetch = original }
}
const ok = () => ({ ok: true, status: 200, arrayBuffer: async () => audio, headers: new Headers() })

test('trocear no pasa del límite ni corta palabras normales', () => {
  const texto = Array.from({ length: 80 }, (_, i) => `palabra${i}`).join(' ')
  const trozos = tts.trocear(texto, 50)
  assert.ok(trozos.length > 1)
  for (const t of trozos) assert.ok(t.length <= 50)
  assert.equal(trozos.join(' '), texto)
  assert.ok(tts.trocear('x'.repeat(130), 50).every((t) => t.length <= 50))
})

test('voz con nombre usa StreamElements', async () => {
  const urls = []
  const restaurar = stubFetch(async (u) => { urls.push(String(u)); return ok() })
  try {
    const r = await tts.generar('hola', 'lupe')
    assert.equal(r.fuente, 'streamelements')
    assert.ok(urls[0].includes('voice=Lupe') && urls[0].includes('text=hola'))
  } finally { restaurar() }
})

test('si StreamElements falla cae a Google en el idioma de la voz', async () => {
  const restaurar = stubFetch(async (u) => String(u).includes('streamelements') ? { ok: false, status: 400, headers: new Headers() } : ok())
  const log = console.error
  console.error = () => {}
  try {
    const r = await tts.generar('hola', 'brian')
    assert.equal(r.fuente, 'google')
    assert.equal(r.etiqueta, 'Inglés')
  } finally { restaurar(); console.error = log }
})

test('idioma largo se manda por trozos y se une', async () => {
  let n = 0
  const restaurar = stubFetch(async () => { n++; return ok() })
  try {
    const r = await tts.generar(Array.from({ length: 100 }, () => 'hola').join(' '), 'es')
    assert.ok(n >= 2)
    assert.equal(r.buffer.length, audio.length * n)
  } finally { restaurar() }
})

test('valida texto vacío, largo y voz inválida', async () => {
  await assert.rejects(tts.generar('  '), /Falta/)
  await assert.rejects(tts.generar('x'.repeat(tts.MAX_TEXTO + 1)), /largo/)
  await assert.rejects(tts.generar('hola', 'zzz'), /no válido/)
})

test('el comando .tts envía el audio y acepta texto citado', async () => {
  const cmd = require('../modulos/utilidad/tts')
  const config = require('../defaults')
  const restaurar = stubFetch(async () => ok())
  const enviados = []
  const sock = { sendMessage: async (j, c) => { enviados.push(c) } }
  try {
    const msg = { key: { remoteJid: 'a@g.us' }, message: { extendedTextMessage: { contextInfo: { quotedMessage: { conversation: 'hola citado' } } } } }
    await cmd.execute(sock, msg, [], { config })
    assert.ok(Buffer.isBuffer(enviados[0].audio))
    await cmd.execute(sock, { key: { remoteJid: 'a@g.us' }, message: {} }, [], { config })
    assert.ok(enviados[1].text.includes('Escribe el texto'))
  } finally { restaurar() }
})
