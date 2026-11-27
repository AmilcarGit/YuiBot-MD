// Código Oficial de YuiBot-MD.by AmilcarGit
import test from 'node:test'
import assert from 'node:assert/strict'
import { acortar, calcular, codigoIdioma, codigoMoneda, convertir, traducir, wikipedia } from '../nucleo/herramientas.js'
import calc from '../habilidades/herramientas/calc.js'
import cambio from '../habilidades/herramientas/cambio.js'
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
  const t = await conFetch(json([[['Hola Mundo', 'hello world']], null, 'en']), () => traducir('hello world', 'es'))
  assert.deepEqual(t, { traduccion: 'Hola Mundo', origen: 'en' })
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
