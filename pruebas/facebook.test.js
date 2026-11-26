// Código Oficial de YuiBot-MD.by AmilcarGit
import test from 'node:test'
import assert from 'node:assert/strict'
import { esEnlaceFacebook, facebookVideo } from '../nucleo/descargas.js'
import facebook from '../habilidades/descargas/facebook.js'

const conFetch = async (f, fn) => { const o = globalThis.fetch; globalThis.fetch = f; try { return await fn() } finally { globalThis.fetch = o } }
const json = cuerpo => async () => ({ ok: true, status: 200, json: async () => cuerpo })

test('esEnlaceFacebook reconoce los enlaces de Facebook y fb.watch', () => {
  for (const u of ['https://www.facebook.com/watch?v=1', 'https://fb.watch/abc/', 'https://m.facebook.com/reel/123', 'https://web.facebook.com/x/videos/1']) assert.ok(esEnlaceFacebook(u), u)
  for (const u of ['https://youtube.com/watch?v=1', 'hola', undefined, 'https://notfacebook.com/x']) assert.ok(!esEnlaceFacebook(u), String(u))
})

test('facebookVideo devuelve HD, SD y el título (sin "Sin título")', async () => {
  const cuerpo = { status: true, result: { title: 'Sin título', media: { video_hd: 'https://v.fbcdn.net/hd.mp4', video_sd: 'https://v.fbcdn.net/sd.mp4' }, info: { title: 'Mi video' } } }
  const v = await conFetch(json(cuerpo), () => facebookVideo('https://www.facebook.com/watch?v=1'))
  assert.deepEqual(v, { hd: 'https://v.fbcdn.net/hd.mp4', sd: 'https://v.fbcdn.net/sd.mp4', titulo: 'Mi video' })
  await assert.rejects(conFetch(json({ status: true, result: { title: '', links: {} } }), () => facebookVideo('https://www.facebook.com/reel/1')), /público/)
})

test('.facebook envía el video y, si el HD falla, prueba el SD', async () => {
  const cuerpo = { status: true, result: { media: { video_hd: 'https://v.fbcdn.net/hd.mp4', video_sd: 'https://v.fbcdn.net/sd.mp4' } } }
  const enviados = []; const respuestas = []
  const ctx = { numero: 'fb1', prefijo: '.', args: ['https://fb.watch/abc/'], responder: async t => respuestas.push(t), enviar: async c => { if (c.video.url.endsWith('hd.mp4')) throw new Error('muy pesado'); enviados.push(c) } }
  await conFetch(json(cuerpo), () => facebook.ejecutar({}, {}, ctx))
  assert.equal(enviados.length, 1); assert.equal(enviados[0].video.url, 'https://v.fbcdn.net/sd.mp4')
  const mala = { numero: 'fb2', prefijo: '.', args: ['hola'], responder: async t => respuestas.push(t), enviar: async () => assert.fail() }
  await facebook.ejecutar({}, {}, mala)
  assert.match(respuestas.at(-1), /enlace de un video/)
})
