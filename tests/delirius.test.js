// Adaptadores de Delirius: usan las respuestas reales de la API (api.delirius.online).
const test = require('node:test')
const assert = require('node:assert/strict')
const { _internos } = require('../lib/delirius')

test('búsqueda de YouTube se adapta al formato que usan los comandos', () => {
  const r = _internos.adaptarBusqueda([
    { type: 'video', url: 'https://youtu.be/_PJvpq8uOZM', title: 'MONACO', duration: '7:20', author: { name: 'Bad Bunny' } },
    { type: 'channel', url: 'https://youtube.com/@x', title: 'canal' },
  ])
  assert.deepEqual(r.datos.results.videos, [{ title: 'MONACO', url: 'https://youtu.be/_PJvpq8uOZM', channel: 'Bad Bunny', duration: '7:20' }])
})

test('ytmp3 adapta data.download a datos.url', () => {
  const r = _internos.adaptarYoutube({ title: 'Never Gonna', author: 'Rick', format: 'mp3', download: 'https://cdn.ejemplo.com/a.mp3' }, '128 kbps')
  assert.equal(r.datos.url, 'https://cdn.ejemplo.com/a.mp3')
  assert.equal(r.titulo, 'Never Gonna')
  assert.equal(r.canal, 'Rick')
})

test('YouTube sin enlace de descarga lanza error', () => {
  assert.throws(() => _internos.adaptarYoutube({ title: 'x', download: '0' }, ''), /enlace/)
})

test('TikTok prefiere HD y toma autor y estadísticas', () => {
  const r = _internos.adaptarTikTok({
    title: 'hola', region: 'GT', repro: '141.416', like: '11.108',
    author: { username: '@u', nickname: 'Nick' },
    meta: { media: [{ type: 'video', org: 'https://x/org.mp4', wm: 'https://x/wm.mp4', hd: 'https://x/hd.mp4' }] },
  })
  assert.equal(r.datos.url, 'https://x/hd.mp4')
  assert.equal(r.autor.nombre, 'Nick')
  assert.equal(r.estadisticas.likes, '11.108')
})

test('TikTok usa org si hd viene vacío', () => {
  const r = _internos.adaptarTikTok({ meta: { media: [{ org: 'https://x/org.mp4', hd: '0' }] } })
  assert.equal(r.datos.url, 'https://x/org.mp4')
})

test('Instagram elige el primer medio con url', () => {
  assert.deepEqual(_internos.adaptarMedios([{ type: 'video', url: 'https://x/v.mp4' }]), { tipo: 'video', url: 'https://x/v.mp4' })
  assert.equal(_internos.adaptarMedios([{ type: 'image', url: 'https://x/i.jpg' }]).tipo, 'image')
  assert.throws(() => _internos.adaptarMedios([]), /archivo/)
})
