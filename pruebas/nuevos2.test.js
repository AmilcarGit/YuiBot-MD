// Código Oficial de YuiBot-MD.by AmilcarGit
import test from 'node:test'
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { buscarLetra, infoAnime, lienzo } from '../nucleo/delirius.js'
import { hayFfmpeg } from '../nucleo/stickers.js'
import letra from '../habilidades/herramientas/letra.js'
import anime from '../habilidades/herramientas/anime.js'
import brat from '../habilidades/stickers/brat.js'
import attp from '../habilidades/stickers/attp.js'
import ship, { compatibilidad } from '../habilidades/juegos/ship.js'
import vor, { RETOS, VERDADES } from '../habilidades/juegos/verdadoreto.js'

const conFetch = async (f, fn) => { const o = globalThis.fetch; globalThis.fetch = f; try { return await fn() } finally { globalThis.fetch = o } }
const json = c => ({ ok: true, status: 200, headers: { get: () => 'application/json' }, json: async () => c })
const por = rutas => async u => { const k = Object.keys(rutas).find(x => String(u).includes(x)); return k ? rutas[k] : { ok: false, status: 404, headers: { get: () => 'text/plain' }, json: async () => ({}) } }
const ctxBase = (args = [], extra = {}) => { const s = { resp: [], env: [], bot: [] }; return { s, numero: 'x', prefijo: '.', args, usuario: { nombre: 'Ana' }, responder: async t => s.resp.push(t), enviar: async c => s.env.push(c), botones: async (t, l) => s.bot.push({ t, l }), ...extra } }

test('.letra muestra la letra y la corta si es enorme', async () => {
  const l = await conFetch(por({ '/search/lyrics': json({ status: true, data: { title: 'DtMF', artists: 'Bad Bunny', duration: '3:57', lyrics: 'Línea uno\nLínea dos' } }) }), () => buscarLetra('dtmf'))
  assert.equal(l.artista, 'Bad Bunny')
  const ctx = ctxBase(['dtmf']); await conFetch(por({ '/search/lyrics': json({ status: true, data: { title: 'Larga', lyrics: 'abcdefghij\n'.repeat(500) } }) }), () => letra.ejecutar({}, {}, ctx))
  assert.match(ctx.s.resp[0], /la corté/); assert.ok(ctx.s.resp[0].length < 4500)
  const sin = ctxBase([]); await letra.ejecutar({}, {}, sin); assert.match(sin.s.resp[0], /De qué canción/)
})

test('.anime arma la ficha con imagen', async () => {
  const dato = { status: true, data: { title: 'Naruto', japaneseTitle: 'ナルト', score: '8.03', ranked: '#726', type: 'TV', episodes: '220', status: 'Finished Airing', genres: ['Action'], studios: ['Pierrot'], synopsis: 'Un ninja. '.repeat(100), picture: 'https://cdn/x.jpg', url: 'https://myanimelist.net/anime/20' } }
  assert.equal((await conFetch(por({ '/anime/animeinfo': json(dato) }), () => infoAnime('naruto'))).episodios, '220')
  const ctx = ctxBase(['naruto']); await conFetch(por({ '/anime/animeinfo': json(dato) }), () => anime.ejecutar({}, {}, ctx))
  assert.equal(ctx.s.env[0].image.url, 'https://cdn/x.jpg'); assert.match(ctx.s.env[0].caption, /220 episodios/); assert.match(ctx.s.env[0].caption, /…/)
})

test('.ship es consistente, simétrico y entiende nombres y menciones', async () => {
  assert.equal(compatibilidad('ana', 'luis'), compatibilidad('LUIS', 'Ana')); assert.ok(compatibilidad('a', 'b') >= 0 && compatibilidad('a', 'b') <= 100)
  const t = ctxBase(['ana', 'y', 'luis']); await ship.ejecutar({}, { key: {} }, t); assert.match(t.s.resp[0], /ana 💘 luis/); assert.match(t.s.resp[0], /\d+%/)
  const m = { key: { remoteJid: 'g@g.us', participant: '51900000001@s.whatsapp.net' }, message: { extendedTextMessage: { text: '.ship @a @b', contextInfo: { mentionedJid: ['51900000002@s.whatsapp.net', '51900000003@s.whatsapp.net'] } } } }
  const g = ctxBase(['@a', '@b']); await ship.ejecutar({}, m, g); assert.deepEqual(g.s.env[0].mentions, ['51900000002@s.whatsapp.net', '51900000003@s.whatsapp.net']); assert.match(g.s.env[0].text, /@51900000002/)
  const nada = ctxBase(['sola']); await ship.ejecutar({}, { key: {} }, nada); assert.match(nada.s.resp[0], /dos nombres/)
})

test('verdad o reto: elige según la palabra usada y ofrece botones', async () => {
  const v = ctxBase([], { texto: '.verdad' }); await vor.ejecutar({}, {}, v); assert.ok(VERDADES.some(x => v.s.bot[0].t.includes(x))); assert.deepEqual(v.s.bot[0].l.map(b => b.cmd), ['verdad', 'reto', 'verdadoreto'])
  const r = ctxBase([], { texto: '.reto' }); await vor.ejecutar({}, {}, r); assert.ok(RETOS.some(x => r.s.bot[0].t.includes(x)))
})

test('.brat y .attp convierten la imagen de la API en sticker con firma', async t => {
  if (!(await hayFfmpeg())) return t.skip('sin ffmpeg')
  const png = execFileSync('ffmpeg', ['-v', 'error', '-f', 'lavfi', '-i', 'color=c=0x8ACE00:s=512x512:d=1', '-frames:v', '1', '-f', 'image2', '-c:v', 'png', '-'], { maxBuffer: 1 << 24 })
  const imagen = { ok: true, status: 200, headers: { get: () => 'image/png' }, arrayBuffer: async () => png }
  const ctx = ctxBase(['hola', 'yui']); await conFetch(por({ '/canvas/brat': imagen }), () => brat.ejecutar({}, {}, ctx))
  const s = ctx.s.env[0].sticker; assert.equal(s.toString('ascii', 8, 12), 'WEBP'); assert.ok(s.includes(Buffer.from('EXIF')))
  const mala = ctxBase(['x']); await conFetch(por({}), () => attp.ejecutar({}, {}, mala)); assert.match(mala.s.resp[0], /No pude crear/)
  const sin = ctxBase([]); await brat.ejecutar({}, {}, sin); assert.match(sin.s.resp[0], /Qué texto/)
  await assert.rejects(conFetch(por({ '/canvas/brat': { ok: true, status: 200, headers: { get: () => 'text/html' }, arrayBuffer: async () => Buffer.from('x') } }), () => lienzo('/canvas/brat', { text: 'x' })), /no devolvió una imagen/)
})
