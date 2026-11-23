import test from 'node:test'
import assert from 'node:assert/strict'
import { buscarYoutube, ytmp3, ytmp4, esEnlaceYoutube, tomar, soltar } from '../nucleo/descargas.js'

const responder = (cuerpo, ok = true) => async url => { responder.urls.push(String(url)); return { ok, status: ok ? 200 : 500, json: async () => cuerpo } }
responder.urls = []
const con = async (cuerpo, fn, ok) => {
  const original = globalThis.fetch
  globalThis.fetch = responder(cuerpo, ok)
  try { return await fn() } finally { globalThis.fetch = original }
}

test('busca en YouTube con la apikey y devuelve datos limpios', async () => {
  const r = await con({ status: true, data: [{ type: 'video', url: 'https://youtu.be/a', title: 'T', duration: '3:45', author: { name: 'A' }, views: 5, thumbnail: 'm' }, { type: 'video', url: 'https://youtu.be/b', title: 'En vivo', isLive: true }, { type: 'channel' }] }, () => buscarYoutube('Patadas de Ahogado'))
  assert.deepEqual(r, [{ url: 'https://youtu.be/a', titulo: 'T', duracion: '3:45', canal: 'A', vistas: 5, miniatura: 'm' }])
  assert.match(responder.urls.at(-1), /nexora-api-max6\.onrender\.com\/api\/busqueda\/youtube\?query=Patadas\+de\+Ahogado&apikey=nexora_/)
})

test('ytmp3 entrega el enlace y falla si no hay', async () => {
  assert.equal(await con({ status: true, data: { format: 'mp3', download: 'https://x.test/a.mp3' } }, () => ytmp3('https://youtu.be/a')), 'https://x.test/a.mp3')
  await assert.rejects(con({ status: true, data: { download: '' } }, () => ytmp3('https://youtu.be/a')))
  await assert.rejects(con({ message: 'mal' }, () => ytmp3('https://youtu.be/a'), false))
})

test('ytmp4 busca el enlace en cualquiera de los campos de YOSOYO', async () => {
  const v = (downloads, download) => ({ result: [{ title: 'S', downloads, download }] })
  assert.equal((await con(v({ mp4: { url: 'https://x.test/1.mp4' } }), () => ytmp4('https://youtu.be/a'))).url, 'https://x.test/1.mp4')
  assert.equal((await con(v({ mp4: { url: '' }, v2: { download: { mp4: 'https://x.test/2.mp4' } } }), () => ytmp4('https://youtu.be/a'))).url, 'https://x.test/2.mp4')
  assert.equal((await con(v({}, { mp4: 'https://x.test/3.mp4' }), () => ytmp4('https://youtu.be/a'))).url, 'https://x.test/3.mp4')
  await assert.rejects(con(v({ mp4: { url: '' } }, { mp4: '' }), () => ytmp4('https://youtu.be/a')))
  assert.match(responder.urls.at(-1), /api-yosoyyo-api-ofc\.onrender\.com\/api\/youtube\?q=.*&apiKey=AmilcarGit/)
})

test('reconoce enlaces de YouTube y limita a una descarga por persona', () => {
  assert.ok(esEnlaceYoutube('https://www.youtube.com/watch?v=1') && esEnlaceYoutube('youtu.be/1'))
  assert.ok(!esEnlaceYoutube('hola') && !esEnlaceYoutube(undefined))
  assert.ok(tomar('51'))
  assert.ok(!tomar('51'))
  soltar('51')
  assert.ok(tomar('51')); soltar('51')
})
