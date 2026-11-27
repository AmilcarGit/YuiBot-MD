// Código Oficial de YuiBot-MD.by AmilcarGit
import test from 'node:test'
import assert from 'node:assert/strict'
import { buscarApk, codigoPais, leerNoticias, mediafire, noticias, preguntarIA, tamano } from '../nucleo/utilidades.js'
import ia from '../habilidades/herramientas/ia.js'
import noticiasCmd from '../habilidades/herramientas/noticias.js'
import apk from '../habilidades/descargas/apk.js'
import mediafireCmd from '../habilidades/descargas/mediafire.js'

const conFetch = async (f, fn) => { const o = globalThis.fetch; globalThis.fetch = f; try { return await fn() } finally { globalThis.fetch = o } }
const resp = (cuerpo, { ok = true, status = 200 } = {}) => ({ ok, status, headers: { get: () => null }, text: async () => (typeof cuerpo === 'string' ? cuerpo : JSON.stringify(cuerpo)), json: async () => (typeof cuerpo === 'string' ? JSON.parse(cuerpo) : cuerpo) })
const por = rutas => async url => { const k = Object.keys(rutas).find(x => String(url).includes(x)); return k ? rutas[k] : resp({}, { ok: false, status: 404 }) }
const ctxBase = (args, extra = {}) => { const salida = { env: [], resp: [] }; return { salida, numero: `t${Math.random()}`, prefijo: '.', args, responder: async t => salida.resp.push(t), enviar: async c => salida.env.push(c), ...extra } }
const RSS = '<rss><channel><title>x</title><item><title>Piura: inundación afectó a 700 familias - RPP Noticias</title><link>https://news.google.com/rss/articles/AAA?oc=5</link></item><item><title>Titular &amp; más - La República</title><link>https://news.google.com/rss/articles/BBB?oc=5</link></item></channel></rss>'

test('IA: usa Pollinations y, si falla, Delirius; si fallan las dos, avisa los dos motivos', async () => {
  assert.equal(await conFetch(por({ 'pollinations.ai': resp('¡Hola! Soy Yui.') }), () => preguntarIA('hola')), '¡Hola! Soy Yui.')
  assert.equal(await conFetch(por({ 'pollinations.ai': resp('x', { ok: false, status: 502 }), '/ia/chatgpt': resp({ status: true, data: 'Respuesta de respaldo' }) }), () => preguntarIA('hola')), 'Respuesta de respaldo')
  await assert.rejects(conFetch(por({}), () => preguntarIA('hola')), /Pollinations.*Delirius/)
})

test('.ia pide una pregunta, responde y frena los mensajes seguidos', async () => {
  const sin = ctxBase([]); await ia.ejecutar({}, {}, sin); assert.match(sin.salida.resp[0], /Qué quieres preguntarme/)
  const ctx = ctxBase(['hola', 'yui'])
  await conFetch(por({ 'pollinations.ai': resp('¡Hola, hola!') }), () => ia.ejecutar({}, {}, ctx))
  assert.match(ctx.salida.resp.at(-1), /¡Hola, hola!/)
  await ia.ejecutar({}, {}, ctx); assert.match(ctx.salida.resp.at(-1), /Un momentito/)
})

test('noticias: lee el RSS, separa la fuente y entiende país y tema', async () => {
  const l = leerNoticias(RSS)
  assert.deepEqual(l.map(x => [x.titulo, x.fuente]), [['Piura: inundación afectó a 700 familias', 'RPP Noticias'], ['Titular & más', 'La República']])
  assert.equal(codigoPais('MX'), 'mx'); assert.equal(codigoPais('fútbol'), null)
  let visto = ''
  await conFetch(async u => { visto = String(u); return resp(RSS) }, () => noticias({ pais: 'mx', tema: 'economía' }))
  assert.match(visto, /search\?q=econom/); assert.match(visto, /gl=MX/)
  const ctx = ctxBase(['mx', 'economía'])
  await conFetch(por({ 'news.google.com': resp(RSS) }), () => noticiasCmd.ejecutar({}, {}, ctx))
  assert.match(ctx.salida.resp[0], /RPP Noticias/)
})

test('APK: manda el archivo como documento; si es enorme o es la web, da el enlace', async () => {
  const dato = (bytes) => resp({ status: true, data: { name: 'WhatsApp', id: 'com.whatsapp', developer: 'WhatsApp Inc.', size: '161 MB', sizeByte: bytes, image: 'https://i/x.png', download: 'https://pool.apk/wa.apk', stats: { downloads: 2e9 } } })
  assert.equal((await conFetch(por({ '/download/apk': dato(100) }), () => buscarApk('whatsapp'))).paquete, 'com.whatsapp')
  const chico = ctxBase(['whatsapp']); await conFetch(por({ '/download/apk': dato(50 * 1024 * 1024) }), () => apk.ejecutar({}, {}, chico))
  const doc = chico.salida.env.find(e => e.document); assert.equal(doc.document.url, 'https://pool.apk/wa.apk'); assert.equal(doc.fileName, 'WhatsApp.apk')
  const grande = ctxBase(['whatsapp']); await conFetch(por({ '/download/apk': dato(400 * 1024 * 1024) }), () => apk.ejecutar({}, {}, grande))
  assert.ok(!grande.salida.env.some(e => e.document)); assert.match(JSON.stringify(grande.salida), /Pesa más/)
  const web = ctxBase(['whatsapp'], { web: true }); await conFetch(por({ '/download/apk': dato(1000) }), () => apk.ejecutar({}, {}, web))
  assert.ok(!web.salida.env.some(e => e.document)); assert.match(JSON.stringify(web.salida), /pool\.apk/)
  assert.equal(tamano(161462963), '154.0 MB')
})

test('MediaFire: valida el enlace y manda el documento', async () => {
  const f = await conFetch(por({ '/download/mediafire': resp({ status: true, data: { filename: 'a.zip', size: '2 MB', link: 'https://download.mediafire.com/a.zip' } }) }), () => mediafire('https://www.mediafire.com/file/x/a.zip/file'))
  assert.equal(f.nombre, 'a.zip')
  const ctx = ctxBase(['https://www.mediafire.com/file/x/a.zip/file'])
  await conFetch(por({ '/download/mediafire': resp({ status: true, data: { filename: 'a.zip', link: 'https://download.mediafire.com/a.zip' } }) }), () => mediafireCmd.ejecutar({}, {}, ctx))
  assert.equal(ctx.salida.env[0].document.url, 'https://download.mediafire.com/a.zip')
  const mala = ctxBase(['hola']); await mediafireCmd.ejecutar({}, {}, mala); assert.match(mala.salida.resp[0], /enlace de MediaFire/)
})
