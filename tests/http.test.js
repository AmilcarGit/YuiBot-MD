// fetch con timeouts (lib/http.js).
const test = require('node:test')
const assert = require('node:assert/strict')
const http = require('http')
const { crearFetchSeguro, HEADERS_MS, TOTAL_MS } = require('../lib/http')

const fetchRapido = crearFetchSeguro({ headersMs: 300, totalMs: 1200 })
let servidor
let base

test.before(async () => {
  servidor = http.createServer((req, res) => {
    if (req.url === '/rapido') return res.end('hola')
    if (req.url === '/lento-ok') return void setTimeout(() => res.end('tarde pero valido'), 120)
    if (req.url === '/cuelga') return // nunca responde
    if (req.url === '/cuerpo-colgado') { res.writeHead(200); res.write('parcial'); return }
  })
  await new Promise((resolve) => servidor.listen(0, '127.0.0.1', resolve))
  base = `http://127.0.0.1:${servidor.address().port}`
})

test.after(() => {
  servidor.closeAllConnections?.()
  servidor.close()
})

test('los límites por defecto son 30 s a los headers y 5 min en total', () => {
  assert.equal(HEADERS_MS, 30000)
  assert.equal(TOTAL_MS, 300000)
})

test('una respuesta normal pasa sin problema', async () => {
  const respuesta = await fetchRapido(`${base}/rapido`)
  assert.equal(await respuesta.text(), 'hola')
})

test('una respuesta lenta pero dentro del límite no se corta', async () => {
  const respuesta = await fetchRapido(`${base}/lento-ok`)
  assert.equal(await respuesta.text(), 'tarde pero valido')
})

test('un servidor que nunca responde falla con un mensaje claro', async () => {
  const inicio = Date.now()
  await assert.rejects(fetchRapido(`${base}/cuelga`), /Tiempo de espera agotado/)
  const transcurrido = Date.now() - inicio
  assert.ok(transcurrido >= 250 && transcurrido < 1000, `abortó a los ${transcurrido} ms`)
})

test('un cuerpo que se cuelga lo corta el tope total (no el de headers)', async () => {
  const inicio = Date.now()
  await assert.rejects(async () => {
    const respuesta = await fetchRapido(`${base}/cuerpo-colgado`)
    await respuesta.text()
  }, /límite total/)
  assert.ok(Date.now() - inicio >= 1000)
})

test('si quien llama pasa su propio signal, se respeta', async () => {
  const controlador = new AbortController()
  setTimeout(() => controlador.abort(new Error('cancelado por mí')), 50)
  await assert.rejects(fetchRapido(`${base}/cuelga`, { signal: controlador.signal }), /cancelado por mí/)
})
