// .delirius: explorador de endpoints (con un servidor falso).
const test = require('node:test')
const assert = require('node:assert/strict')
const delirius = require('../lib/delirius')
const cmd = require('../modulos/owner/delirius')
const config = require('../defaults')

test('leerParametros: pares, ; y texto suelto', () => {
  assert.deepEqual(cmd.leerParametros('q=hola mundo ; lang=es'), { q: 'hola mundo', lang: 'es' })
  assert.deepEqual(cmd.leerParametros('monaco'), { q: 'monaco' })
  assert.deepEqual(cmd.leerParametros(''), {})
  assert.deepEqual(cmd.leerParametros('=x ; bad key=1 ; ok=2'), { ok: '2' })
})

test('forma: resume la estructura sin valores largos', () => {
  const f = cmd.forma({ status: true, data: [{ title: 'x'.repeat(100), n: 3 }, { title: 'otro' }] })
  assert.deepEqual(f, { status: true, data: ['2 elemento(s)', { title: 'string(100)', n: 3 }] })
})

function sockFalso() { const e = []; return { e, sendMessage: async (j, c) => { e.push(c); return {} } } }
const msg = { key: { remoteJid: 'x@s.whatsapp.net' } }

test('rechaza rutas raras y no sale de la base', async () => {
  const s = sockFalso()
  for (const ruta of ['https://malo.com/x', '/../etc', '//otro.com', 'search']) { await cmd.execute(s, msg, [ruta], { config }); assert.match(s.e.at(-1).text, /Ruta no válida/, ruta) }
})

test('explorar devuelve la respuesta cruda (JSON y no JSON) y arma bien la URL', async () => {
  let pedida
  const fetchJson = async (url) => { pedida = url; return { status: 200, headers: { get: () => 'application/json; charset=utf-8' }, text: async () => '{"status":true,"data":[1]}' } }
  const r = await delirius.explorar('/search/lyrics', { q: 'hola mundo' }, fetchJson)
  assert.equal(r.http, 200); assert.deepEqual(r.json, { status: true, data: [1] })
  assert.equal(pedida, 'https://api.delirius.online/search/lyrics?q=hola+mundo')
  const html = await delirius.explorar('/x', {}, async () => ({ status: 502, headers: { get: () => 'text/html' }, text: async () => '<html>' }))
  assert.equal(html.http, 502); assert.equal(html.json, null); assert.equal(html.texto, '<html>')
})
