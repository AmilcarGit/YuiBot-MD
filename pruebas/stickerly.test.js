// Código Oficial de YuiBot-MD.by AmilcarGit
import test from 'node:test'
import assert from 'node:assert/strict'
import { buscarStickerly, esEnlaceStickerly, packStickerly } from '../nucleo/delirius.js'
import stickerly, { prepararSticker } from '../habilidades/stickers/stickerly.js'

const conFetch = async (f, fn) => { const o = globalThis.fetch; globalThis.fetch = f; try { return await fn() } finally { globalThis.fetch = o } }
// WebP real de 1×1 píxel
const webp = () => Buffer.from('UklGRhoAAABXRUJQVlA4TA0AAAAvAAAAEAcQERGIiP4HAA==', 'base64')
const red = rutas => async url => {
  const u = String(url); const k = Object.keys(rutas).find(x => u.includes(x))
  if (!k) return { ok: false, status: 404, json: async () => ({}) }
  return { ok: true, status: 200, headers: { get: () => null }, json: async () => rutas[k], arrayBuffer: async () => webp() }
}
const PACK = { status: true, data: { name: 'Anime kiss', author: 'Felipe', isAnimated: true, preview: 'https://s/p.webp', stickers: ['https://s/1.webp', 'https://s/2.webp', 'https://s/3.webp'] } }
const ctxBase = (args) => { const salida = { env: [], resp: [], bot: [] }; return { salida, numero: `t${Math.random()}`, prefijo: '.', args, usuario: { nombre: 'Ana' }, responder: async t => salida.resp.push(t), enviar: async c => salida.env.push(c), botones: async (t, l) => salida.bot.push({ t, l }), botonesActivos: true } }

test('enlaces y búsqueda de Sticker.ly (sin paquetes de pago)', async () => {
  assert.ok(esEnlaceStickerly('https://sticker.ly/s/RVL4NV')); assert.ok(!esEnlaceStickerly('anime'))
  const l = await conFetch(red({ '/search/stickerly': { status: true, data: [{ name: 'A', author: 'x', sticker_count: 5, isPaid: false, isAnimated: true, url: 'https://sticker.ly/s/AAA', preview: 'https://p' }, { name: 'Pago', isPaid: true, url: 'https://sticker.ly/s/BBB' }] } }), () => buscarStickerly('anime'))
  assert.deepEqual(l.map(x => x.nombre), ['A'])
  assert.equal((await conFetch(red({ '/download/stickerly': PACK }), () => packStickerly('https://sticker.ly/s/RVL4NV'))).stickers.length, 3)
})

test('prepararSticker conserva el WebP y le pone la firma del paquete', async () => {
  const b = await conFetch(red({}), async () => { globalThis.fetch = red({ 's/1': {} }); return prepararSticker('https://s/1.webp', { nombre: 'Anime kiss', autor: 'Felipe' }, 'Ana') })
  assert.equal(b.toString('ascii', 8, 12), 'WEBP'); assert.ok(b.includes(Buffer.from('EXIF'))); assert.ok(b.includes(Buffer.from('Anime kiss')))
})

test('.stickerly con enlace manda la portada y todos los stickers en orden; con un número, solo esos', async () => {
  const rutas = { '/download/stickerly': PACK, 's/': {} }
  const ctx = ctxBase(['https://sticker.ly/s/RVL4NV'])
  await conFetch(red(rutas), () => stickerly.ejecutar({}, {}, ctx))
  assert.equal(ctx.salida.env.filter(e => e.sticker).length, 3); assert.match(ctx.salida.env[0].caption, /Anime kiss/); assert.match(ctx.salida.resp.at(-1), /3 stickers/)
  const dos = ctxBase(['https://sticker.ly/s/RVL4NV', '2'])
  await conFetch(red(rutas), () => stickerly.ejecutar({}, {}, dos))
  assert.equal(dos.salida.env.filter(e => e.sticker).length, 2)
})

test('.stickerly con una palabra muestra los paquetes con botones', async () => {
  const ctx = ctxBase(['anime'])
  await conFetch(red({ '/search/stickerly': { status: true, data: [{ name: 'Anime kiss', author: 'f', sticker_count: 15, url: 'https://sticker.ly/s/RVL4NV', preview: 'https://p' }] } }), () => stickerly.ejecutar({}, {}, ctx))
  assert.equal(ctx.salida.bot[0].l[0].secciones[0].filas[0].cmd, 'stickerly https://sticker.ly/s/RVL4NV')
})
