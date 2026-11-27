// Código Oficial de YuiBot-MD.by AmilcarGit
import test from 'node:test'
import assert from 'node:assert/strict'
import { REACCIONES, buscarSoundcloud, buscarSpotify, descargarRed, extraerMedios, normalizarWeb, reaccionDe, soundcloudDl, spotifyDl, textoAVoz } from '../nucleo/delirius.js'
import reaccion from '../habilidades/herramientas/reaccion.js'
import ssweb from '../habilidades/herramientas/ssweb.js'
import tiktok from '../habilidades/descargas/tiktok.js'
import instagram from '../habilidades/descargas/instagram.js'
import spotify from '../habilidades/descargas/spotify.js'
import soundcloud from '../habilidades/descargas/soundcloud.js'

const conFetch = async (f, fn) => { const o = globalThis.fetch; globalThis.fetch = f; try { return await fn() } finally { globalThis.fetch = o } }
const por = rutas => async url => {
  const u = String(url); const k = Object.keys(rutas).find(x => u.includes(x))
  if (!k) return { ok: false, status: 404, json: async () => ({ error: 'no' }) }
  const r = rutas[k]
  return { ok: r.ok !== false, status: r.status || 200, json: async () => r.cuerpo, arrayBuffer: async () => Buffer.from('mp4'), headers: { get: () => null } }
}
const ctxBase = (extra = {}) => { const salida = { env: [], resp: [], bot: [] }; return { salida, numero: `t${Math.random()}`, prefijo: '.', args: [], texto: '', responder: async t => salida.resp.push(t), enviar: async c => salida.env.push(c), botones: async (t, l) => salida.bot.push({ t, l }), botonesActivos: true, ...extra } }

test('textoAVoz y estado false de Delirius', async () => {
  const url = await conFetch(por({ '/tools/gtts': { cuerpo: { status: true, data: { download: 'https://x/a.mp3' } } } }), () => textoAVoz('hola', 'es'))
  assert.equal(url, 'https://x/a.mp3')
  await assert.rejects(conFetch(por({ '/tools/gtts': { status: 500, ok: false, cuerpo: { status: false, msg: 'caído' } } }), () => textoAVoz('hola')), /caído/)
})

test('normalizarWeb acepta dominios y rechaza redes internas', () => {
  assert.equal(normalizarWeb('example.com'), 'https://example.com/')
  assert.equal(normalizarWeb('https://example.com/a?b=1'), 'https://example.com/a?b=1')
  for (const x of ['localhost', 'http://127.0.0.1/x', 'hola mundo', '', undefined, 'http://192.168.1.1']) assert.equal(normalizarWeb(x), null, String(x))
})

test('.ssweb manda la imagen de la captura', async () => {
  const ctx = ctxBase({ args: ['example.com'] })
  await conFetch(por({ '/tools/ssweb': { cuerpo: { status: true, data: { download: 'https://api.urlbox.io/v1/x/png' } } } }), () => ssweb.ejecutar({}, {}, ctx))
  assert.equal(ctx.salida.env[0].image.url, 'https://api.urlbox.io/v1/x/png')
  const mala = ctxBase({ args: ['hola'] }); await ssweb.ejecutar({}, {}, mala); assert.match(mala.salida.resp[0], /Pásame la página/)
})

test('reaccionDe entiende nombres en español e inglés', () => {
  assert.equal(reaccionDe('abrazo'), 'hug'); assert.equal(reaccionDe('KISS'), 'kiss'); assert.equal(reaccionDe('bailar'), 'dance'); assert.equal(reaccionDe('nada'), null)
  assert.ok(Object.keys(REACCIONES).length >= 25)
})

test('.abrazo @alguien manda el GIF mencionando a las dos personas', async () => {
  const m = { key: { remoteJid: 'g@g.us', participant: '51900000001@s.whatsapp.net' }, message: { extendedTextMessage: { text: '.abrazo @b', contextInfo: { mentionedJid: ['51900000002@s.whatsapp.net'] } } } }
  const ctx = ctxBase({ texto: '.abrazo @b', args: ['@b'], m })
  await conFetch(por({ '/reactions/hug': { cuerpo: { status: true, data: { url: 'http://cdn.delirius.online/hug.mp4' } } } }), () => reaccion.ejecutar({}, m, ctx))
  const e = ctx.salida.env[0]
  assert.equal(e.gifPlayback, true); assert.equal(e.video.url, 'http://cdn.delirius.online/hug.mp4')
  assert.match(e.caption, /@51900000001 abrazó a @51900000002/); assert.deepEqual(e.mentions, ['51900000001@s.whatsapp.net', '51900000002@s.whatsapp.net'])
})

test('.reaccion sin nombre muestra el menú con botones', async () => {
  const ctx = ctxBase({ texto: '.reaccion', m: { key: {} } })
  await reaccion.ejecutar({}, ctx.m, ctx)
  const filas = ctx.salida.bot[0].l[0].secciones.flatMap(s => s.filas)
  assert.ok(filas.some(f => f.cmd === 'reaccion hug')); assert.ok(ctx.salida.bot[0].l[0].secciones.every(s => s.filas.length <= 10))
})

test('extraerMedios toma una calidad por objeto y no confunde miniaturas', () => {
  const r = extraerMedios({ data: [{ url: 'https://c/a.mp4', thumbnail: 'https://c/t.jpg', sd: 'https://c/sd.mp4' }, { type: 'image', url: 'https://c/f.jpg' }] })
  assert.deepEqual(r.map(x => [x.tipo, x.url]), [['video', 'https://c/a.mp4'], ['image', 'https://c/f.jpg']])
})

test('TikTok: video y fotos; errores de Instagram prueban la segunda ruta', async () => {
  const tt = { status: true, data: { title: 'No description found!', author: { nickname: 'Yui' }, meta: { media: [{ type: 'video', org: 'https://t/o.mp4', hd: 'https://t/hd.mp4', wm: 'https://t/w.mp4' }] } } }
  const r = await conFetch(por({ '/download/tiktok': { cuerpo: tt } }), () => descargarRed('tiktok', 'https://vm.tiktok.com/x'))
  assert.deepEqual(r.medios, [{ tipo: 'video', url: 'https://t/hd.mp4' }]); assert.equal(r.titulo, ''); assert.equal(r.autor, 'Yui')
  const ig = await conFetch(por({ '/download/instagramv2': { cuerpo: { status: true, data: [{ url: 'https://i/v.mp4' }] } }, '/download/instagram?': { cuerpo: 'Secondary method failed' } }), () => descargarRed('instagram', 'https://www.instagram.com/reel/x/'))
  assert.equal(ig.medios[0].url, 'https://i/v.mp4')
})

test('.tiktok valida el enlace y envía el video; .instagram avisa si falla', async () => {
  const ctx = ctxBase({ args: ['https://vm.tiktok.com/x'] })
  await conFetch(por({ '/download/tiktok': { cuerpo: { status: true, data: { title: 'Hola', meta: { media: [{ type: 'video', hd: 'https://t/hd.mp4' }] } } } } }), () => tiktok.ejecutar({}, {}, ctx))
  assert.equal(ctx.salida.env[0].video.url, 'https://t/hd.mp4'); assert.match(ctx.salida.env[0].caption, /Hola/)
  const mal1 = ctxBase({ args: ['hola'] }); await tiktok.ejecutar({}, {}, mal1); assert.match(mal1.salida.resp[0], /enlace de una publicación/)
  const mal2 = ctxBase({ args: ['https://www.instagram.com/p/x/'] })
  await conFetch(por({}), () => instagram.ejecutar({}, {}, mal2)); assert.match(mal2.salida.resp.at(-1), /No pude bajar/)
})

test('Spotify: busca, lista con botones y descarga por enlace', async () => {
  const lista = await conFetch(por({ '/search/spotify': { cuerpo: { status: true, data: [{ title: 'DtMF', artist: 'Bad Bunny', duration: '3:57', url: 'https://open.spotify.com/track/abc', image: 'https://i/x.jpg' }] } } }), () => buscarSpotify('bad bunny'))
  assert.equal(lista[0].artista, 'Bad Bunny')
  const ctx = ctxBase({ args: ['bad', 'bunny'] })
  await conFetch(por({ '/search/spotify': { cuerpo: { status: true, data: [{ title: 'DtMF', artist: 'Bad Bunny', duration: '3:57', url: 'https://open.spotify.com/track/abc' }] } } }), () => spotify.ejecutar({}, {}, ctx))
  assert.equal(ctx.salida.bot[0].l[0].secciones[0].filas[0].cmd, 'spotify https://open.spotify.com/track/abc')
  const dl = ctxBase({ args: ['https://open.spotify.com/track/abc'] })
  await conFetch(por({ '/download/spotifydl': { cuerpo: { status: true, data: { title: 'DtMF', author: 'Bad Bunny', image: 'https://i/x.jpg', download: 'https://rapid.spotidown.app/v2?token=1' } } } }), () => spotify.ejecutar({}, { key: {} }, dl))
  assert.equal(dl.salida.env.at(-1).audio.url, 'https://rapid.spotidown.app/v2?token=1')
  assert.equal((await conFetch(por({ '/download/spotifydl': { cuerpo: { status: true, data: { download: 'https://r/a' } } } }), () => spotifyDl('https://open.spotify.com/track/abc'))).url, 'https://r/a')
})

test('SoundCloud: busca y, si no se puede bajar, sugiere otra opción', async () => {
  const l = await conFetch(por({ '/search/soundcloud': { cuerpo: { status: true, data: [{ title: 'Lofi', artist: '-', duration: 216190, link: 'https://soundcloud.com/a/b', image: 'https://i/x.jpg' }] } } }), () => buscarSoundcloud('lofi'))
  assert.deepEqual([l[0].duracion, l[0].artista], ['3:36', ''])
  await assert.rejects(conFetch(por({ '/download/soundcloud': { ok: false, status: 500, cuerpo: { status: false, msg: 'No direct MP3 stream' } } }), () => soundcloudDl('https://soundcloud.com/a/b')), /No direct MP3/)
  const ctx = ctxBase({ args: ['https://soundcloud.com/a/b'] })
  await conFetch(por({ '/download/soundcloud': { ok: false, status: 500, cuerpo: { status: false, msg: 'x' } } }), () => soundcloud.ejecutar({}, {}, ctx))
  assert.match(ctx.salida.resp.at(-1), /spotify/)
})
