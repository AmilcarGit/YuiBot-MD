// Código Oficial de YuiBot-MD.by AmilcarGit
import test from 'node:test'
import assert from 'node:assert/strict'
import { extraerDeHtml, extraerVideos, esEnlacePin, pinsearch, pinvid, pinimg } from '../nucleo/pinterest.js'
import pin from '../habilidades/descargas/pin.js'

const HTML_BUSQUEDA = `<html><body>
  <a href="/pin/111111111111111/"><img src="https://i.pinimg.com/236x/aa/bb/cc/uno.jpg" srcset="https://i.pinimg.com/236x/aa/bb/cc/uno.jpg 1x, https://i.pinimg.com/474x/aa/bb/cc/uno.jpg 2x"></a>
  <a href="/pin/222222222222222/"><img src="https://i.pinimg.com/236x/dd/ee/ff/dos.jpg"></a>
  <img src="https://i.pinimg.com/60x60/xx/yy/avatar.jpg">
  <a href="/pin/111111111111111/"><img src="https://i.pinimg.com/236x/aa/bb/cc/uno.jpg"></a>
  <div style="background:url('https://i.pinimg.com/474x/gg/hh/ii/tres.jpg')"></div>
  <script>{"bookmark":"abc123"}</script>
</body></html>`
const HTML_VIDEO = `<script>{"url":"https:\\/\\/x"} "https://v1.pinimg.com/videos/mc/720p/aa/bb/clip.mp4" y otra "https://v2.pinimg.com/videos/mc/360p/cc/otra.mp4"</script>`

function conFetch(respuestas, fn) {
  const original = globalThis.fetch
  globalThis.fetch = async url => {
    const u = String(url); const hit = respuestas.find(([patron]) => u.includes(patron))
    if (!hit) return { ok: false, status: 404, url: u, text: async () => '' }
    return { ok: true, status: 200, url: hit[2] || u, text: async () => hit[1] }
  }
  return fn().finally(() => { globalThis.fetch = original })
}

test('reconoce enlaces de pin y extrae imágenes sin repetir, en tamaño 736x', () => {
  assert.ok(esEnlacePin('https://pin.it/abc')); assert.ok(esEnlacePin('https://www.pinterest.com/pin/123/')); assert.ok(!esEnlacePin('gatitos'))
  const { pinIds, imgList } = extraerDeHtml(HTML_BUSQUEDA)
  assert.deepEqual(pinIds, ['111111111111111', '222222222222222'])
  assert.deepEqual(imgList, ['https://i.pinimg.com/736x/aa/bb/cc/uno.jpg', 'https://i.pinimg.com/736x/dd/ee/ff/dos.jpg', 'https://i.pinimg.com/736x/gg/hh/ii/tres.jpg'])
})

test('pinsearch devuelve resultados con su pin y falla claro si no hay', async () => {
  const r = await conFetch([['search/pins/?q=unico-1', HTML_BUSQUEDA]], () => pinsearch('unico-1', 2))
  assert.equal(r.length, 2); assert.equal(r[0].url, 'https://www.pinterest.com/pin/111111111111111/'); assert.match(r[0].image, /736x/)
  await assert.rejects(conFetch([['search/pins/?q=nada-1', '<html></html>']], () => pinsearch('nada-1')), /Sin resultados/)
})

test('pinvid saca los videos en 720p y 480p', async () => {
  const v = extraerVideos(HTML_VIDEO, 5)
  assert.equal(v.length, 2); assert.match(v[0].video, /\/720p\//); assert.match(v[0].sd, /\/480p\//)
  const r = await conFetch([['/pin/999/', HTML_VIDEO]], () => pinvid('https://www.pinterest.com/pin/999/', 1))
  assert.equal(r.length, 1)
  await assert.rejects(conFetch([['/pin/998/', '<html></html>']], () => pinvid('https://www.pinterest.com/pin/998/')), /no tiene video/)
})

test('pinimg con enlace lee los datos del pin (y resuelve pin.it)', async () => {
  const datos = { v3GetPinQuery: { data: { title: 'Gato', description: ' Un gato ', images_orig: { url: 'https://i.pinimg.com/originals/a/b/c.jpg' }, nativeCreator: { fullName: 'Ana' }, aggregatedPinData: { aggregatedStats: { saves: 42 } } } } }
  const html = `<script>window.__X__ = ${JSON.stringify(datos)};</script>`
  const r = await conFetch([['pin.it/corto', '', 'https://www.pinterest.com/pin/777/?x=1'], ['/pin/777/', html]], () => pinimg('https://pin.it/corto'))
  assert.equal(r.titulo, 'Gato'); assert.equal(r.descripcion, 'Un gato'); assert.equal(r.autor, 'Ana'); assert.equal(r.guardados, 42); assert.equal(r.id, '777')
})

test('.pin envía imágenes y explica los errores', async () => {
  const enviados = []; const respuestas = []
  const ctx = { args: ['unico-2'], prefijo: '.', numero: 'n1', responder: t => respuestas.push(t), enviar: c => enviados.push(c) }
  await conFetch([['search/pins/?q=unico-2', HTML_BUSQUEDA]], () => pin.ejecutar({}, {}, ctx))
  assert.equal(enviados.length, 3); assert.ok(enviados.every(e => e.image.url.startsWith('https://i.pinimg.com/736x/')))
  // con un número al final se piden más; aquí solo hay 3 en la página de prueba
  const ctx2 = { ...ctx, args: ['nada-2'], responder: t => respuestas.push(t) }
  await conFetch([['search/pins/?q=nada-2', '<html></html>']], () => pin.ejecutar({}, {}, ctx2))
  assert.match(respuestas.at(-1), /No pude traer imágenes/)
  const ctx3 = { ...ctx, args: [], responder: t => respuestas.push(t) }
  await pin.ejecutar({}, {}, ctx3); assert.match(respuestas.at(-1), /Dime qué buscar/)
})
