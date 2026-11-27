// Código Oficial de YuiBot-MD.by AmilcarGit
import test from 'node:test'
import assert from 'node:assert/strict'
import { acortar, calcular, codigoIdioma, codigoMoneda, convertir, traducir, wikipedia } from '../nucleo/herramientas.js'
import calc from '../habilidades/herramientas/calc.js'
import cambio from '../habilidades/herramientas/cambio.js'
import traducirCmd from '../habilidades/herramientas/traducir.js'
import dado from '../habilidades/juegos/dado.js'
import sorteo from '../habilidades/grupo/sorteo.js'

const conFetch = async (f, fn) => { const o = globalThis.fetch; globalThis.fetch = f; try { return await fn() } finally { globalThis.fetch = o } }
const json = cuerpo => async () => ({ ok: true, status: 200, json: async () => cuerpo })

test('calcular: operaciones, prioridades, funciones, porcentajes y errores', () => {
  assert.equal(calcular('12*(3+4)'), 84); assert.equal(calcular('2+3*4'), 14); assert.equal(calcular('2^3^2'), 512)
  assert.equal(calcular('-5+2'), -3); assert.equal(calcular('10 / 4'), 2.5); assert.equal(calcular('20% de 150'), 30)
  assert.equal(calcular('raiz(81)+abs(-2)'), 11); assert.equal(calcular('3x4'), 12); assert.equal(calcular('7 % 4'), 3)
  assert.ok(Math.abs(calcular('pi*2') - 6.2831853072) < 1e-9)
  for (const mala of ['', '2+', '(1+2', '1/0', 'process.exit()', '2 ; 3', 'hola']) assert.throws(() => calcular(mala), mala)
})

test('traducir, wikipedia, convertir y acortar leen bien sus APIs', async () => {
  assert.equal(codigoIdioma('inglés'), 'en'); assert.equal(codigoIdioma('xx'), null); assert.equal(codigoMoneda('soles'), 'PEN'); assert.equal(codigoMoneda('eur'), 'EUR')
  // Primero Delirius…
  const d = await conFetch(async url => (/delirius/.test(String(url)) ? json({ status: true, data: 'hola, cómo estás' })() : assert.fail('no debía usar Google')), () => traducir('hello how are you', 'es'))
  assert.deepEqual(d, { traduccion: 'hola, cómo estás', origen: '' })
  // …y si Delirius falla (o Google también devuelve 429), se prueba la otra y se explica el motivo.
  const g = await conFetch(async url => (/delirius/.test(String(url)) ? { ok: false, status: 500 } : json([[['Hola Mundo', 'hello world']], null, 'en'])()), () => traducir('hello world', 'es'))
  assert.deepEqual(g, { traduccion: 'Hola Mundo', origen: 'en' })
  await assert.rejects(conFetch(async () => ({ ok: false, status: 429 }), () => traducir('hola', 'en')), /Delirius: HTTP 429 · Google: HTTP 429/)
  const w = await conFetch(json({ title: 'Perú', description: 'país', extract: 'El Perú es…', thumbnail: { source: 'https://x/i.png' }, content_urls: { desktop: { page: 'https://es.wikipedia.org/wiki/Per%C3%BA' } } }), () => wikipedia('Perú'))
  assert.equal(w.titulo, 'Perú'); assert.equal(w.imagen, 'https://x/i.png')
  const c = await conFetch(json({ result: 'success', rates: { PEN: 3.5 }, time_last_update_utc: 'Fri, 27 Nov 2026 00:02:31 +0000' }), () => convertir(10, 'USD', 'PEN'))
  assert.equal(c.resultado, 35)
  await assert.rejects(conFetch(json({ result: 'success', rates: {} }), () => convertir(1, 'USD', 'ZZZ')), /ZZZ/)
  assert.equal(await conFetch(json({ shorturl: 'https://is.gd/abc' }), () => acortar('https://example.com/x')), 'https://is.gd/abc')
})

test('.calc, .cambio, .dado y .sorteo responden bien', async () => {
  const salida = []; const base = { prefijo: '.', responder: async t => salida.push(t), enviar: async c => salida.push(c) }
  await calc.ejecutar({}, {}, { ...base, args: ['2+2'] }); assert.match(salida.at(-1), /= \*4\*/)
  await calc.ejecutar({}, {}, { ...base, args: ['2+'] }); assert.match(salida.at(-1), /incompleta|Falta/)
  await conFetch(json({ result: 'success', rates: { PEN: 3.5 } }), () => cambio.ejecutar({}, {}, { ...base, args: ['10', 'usd', 'soles'], texto: '.cambio 10 usd soles' }))
  assert.match(salida.at(-1), /35 PEN/)
  await conFetch(json({ result: 'success', rates: { PEN: 3.5 } }), () => cambio.ejecutar({}, {}, { ...base, args: [], texto: '.dolar' }))
  assert.match(salida.at(-1), /1 USD =/)
  await dado.ejecutar({}, {}, { ...base, args: ['3d6'] }); assert.match(salida.at(-1), /3d6/); assert.match(salida.at(-1), /Total/)
  await dado.ejecutar({}, {}, { ...base, args: ['99d9'] }); assert.match(salida.at(-1), /Uso/)
  const sock = { user: { id: '1:2@s.whatsapp.net' }, groupMetadata: async () => ({ participants: [{ id: '1@s.whatsapp.net' }, { id: '51111@s.whatsapp.net' }, { id: '51222@s.whatsapp.net' }] }) }
  await sorteo.ejecutar(sock, {}, { ...base, args: ['2', 'una', 'pizza'], grupo: true, esAdmin: true, jid: 'g@g.us' })
  const r = salida.at(-1); assert.equal(r.mentions.length, 2); assert.ok(!r.mentions.includes('1@s.whatsapp.net')); assert.match(r.text, /una pizza/)
  await sorteo.ejecutar(sock, {}, { ...base, args: [], grupo: true, esAdmin: false, esDueno: false })
  assert.match(salida.at(-1), /admins/)
})

test('.traducir muestra botones de idioma y los botones reutilizan el último texto', async () => {
  const enviados = []
  const base = { prefijo: '.', numero: 'u-tr', responder: async t => enviados.push({ t }), botones: async (texto, lista) => enviados.push({ texto, lista }) }
  await conFetch(json({ status: true, data: 'hello friends' }), () => traducirCmd.ejecutar({}, {}, { ...base, args: ['en', 'hola', 'amigos'] }))
  const r = enviados.at(-1)
  assert.match(r.texto, /hello friends/)
  assert.deepEqual(r.lista.filter(b => b.cmd).map(b => b.cmd), ['traducir es', 'traducir pt']) // sin repetir el idioma actual
  assert.ok(r.lista.at(-1).secciones[0].filas.length >= 10)
  // Tocar un botón = ".traducir pt" sin texto: usa el último texto de esa persona.
  let pedido
  await conFetch(async url => { pedido = String(url); return json({ status: true, data: 'olá amigos' })() }, () => traducirCmd.ejecutar({}, {}, { ...base, args: ['pt'] }))
  assert.match(decodeURIComponent(pedido), /text=hola amigos&language=pt/)
  await traducirCmd.ejecutar({}, {}, { ...base, numero: 'otro', args: ['pt'] }) // otra persona sin texto guardado
  assert.match(enviados.at(-1).t, /Uso/)
})
