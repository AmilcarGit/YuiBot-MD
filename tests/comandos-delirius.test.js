// Funciones de Delirius y comandos nuevos, con respuestas simuladas que copian
// la forma real de la API (api.delirius.online).
const test = require('node:test')
const assert = require('node:assert/strict')

const delirius = require('../lib/delirius')
const letra = require('../modulos/utilidad/letra')
const ss = require('../modulos/utilidad/ss')
const config = require('../defaults')

const fetchOriginal = globalThis.fetch
let rutas

function simular(mapa) {
  rutas = []
  globalThis.fetch = async (entrada) => {
    const url = new URL(String(entrada))
    rutas.push(url.pathname + url.search)
    const cuerpo = mapa[url.pathname]
    if (cuerpo === undefined) return new Response('no encontrado', { status: 404 })
    if (cuerpo instanceof Uint8Array) return new Response(cuerpo, { status: 200 })
    return new Response(JSON.stringify(cuerpo), { status: 200, headers: { 'content-type': 'application/json' } })
  }
}

test.afterEach(() => { globalThis.fetch = fetchOriginal })

const ok = (data) => ({ creator: 'Delirius', status: true, data })

test('letra: quita "(Letra)" del título y devuelve la letra', async () => {
  simular({ '/search/lyrics': ok({ title: 'Bad Bunny – MONACO (Letra)', artists: 'x', album: 'x', duration: '4:26', lyrics: 'línea 1\nlínea 2' }) })
  const r = await delirius.letra('monaco')
  assert.equal(r.titulo, 'Bad Bunny – MONACO')
  assert.equal(r.duracion, '4:26')
  assert.equal(r.letra, 'línea 1\nlínea 2')
  assert.ok(rutas[0].includes('query=monaco'))
})

test('letra: sin letra lanza error', async () => {
  simular({ '/search/lyrics': ok({ title: 'x', lyrics: '' }) })
  await assert.rejects(delirius.letra('x'), /letra/)
})

test('spotify y soundcloud se normalizan', async () => {
  simular({
    '/search/spotify': ok([{ id: '1', title: 'MONACO', artist: 'Bad Bunny', album: 'NSLQVPM', duration: '4:27', publish: '2023-10-13', url: 'https://open.spotify.com/track/x', image: 'https://i.scdn.co/i' }]),
    '/search/soundcloud': ok([{ title: 'MONACO', artist: 'Bad Bunny', play: 8337964, likes: 1, image: 'https://i1.sndcdn.com/a.jpg', link: 'https://soundcloud.com/badbunny15/bad-bunny-monaco' }]),
  })
  const [sp] = await delirius.buscarSpotify('monaco')
  assert.deepEqual([sp.titulo, sp.artista, sp.imagen], ['MONACO', 'Bad Bunny', 'https://i.scdn.co/i'])
  const [sc] = await delirius.buscarSoundCloud('monaco')
  assert.equal(sc.url, 'https://soundcloud.com/badbunny15/bad-bunny-monaco')
  assert.equal(sc.plays, 8337964)
})

test('pinterest: la respuesta viene en "results"', async () => {
  simular({ '/search/pinterest': { creator: 'Delirius', status: true, results: ['https://i.pinimg.com/a.jpg', 'ruido', 'https://i.pinimg.com/b.png'] } })
  assert.deepEqual(await delirius.buscarPinterest('gatos'), ['https://i.pinimg.com/a.jpg', 'https://i.pinimg.com/b.png'])
  assert.ok(rutas[0].includes('text=gatos'))
})

test('stickerly: búsqueda de paquetes y lista de stickers del paquete', async () => {
  simular({
    '/search/stickerly': ok([{ name: 'GATO', author: 'u', sticker_count: 15, preview: 'https://p/1.webp', url: 'https://sticker.ly/s/193C8X' }]),
    '/download/stickerly': ok({ name: 'GATO', author: 'u', isAnimated: true, stickers: ['https://s/1.webp', 'https://s/2.webp'] }),
  })
  const [pack] = await delirius.buscarStickerly('gato')
  assert.equal(pack.url, 'https://sticker.ly/s/193C8X')
  const paquete = await delirius.paqueteStickerly(pack.url)
  assert.equal(paquete.stickers.length, 2)
  assert.equal(paquete.animado, true)
})

test('captura y chatgpt', async () => {
  simular({ '/tools/ssweb': ok({ download: 'https://api.urlbox.io/x/png' }), '/ia/chatgpt': ok('¡Hola! ¿En qué te ayudo?') })
  assert.equal(await delirius.captura('https://google.com'), 'https://api.urlbox.io/x/png')
  assert.equal(await delirius.chatgpt('hola'), '¡Hola! ¿En qué te ayudo?')
})

test('un HTTP de error o status:false se reporta', async () => {
  simular({})
  await assert.rejects(delirius.chatgpt('x'), /HTTP 404/)
  simular({ '/ia/chatgpt': { status: false, message: 'límite' } })
  await assert.rejects(delirius.chatgpt('x'), /límite/)
})

function crearSock() {
  const enviados = []
  return { enviados, async sendMessage(jid, contenido) { enviados.push(contenido) } }
}
const MSG = { key: { remoteJid: '1@s.whatsapp.net' } }

test('.letra envía título y letra, y parte las letras largas', async () => {
  const larga = Array.from({ length: 200 }, (_, i) => `estrofa ${i} ` + 'la '.repeat(40)).join('\n\n')
  simular({ '/search/lyrics': ok({ title: 'Canción (Letra)', duration: '3:00', lyrics: larga }) })
  const sock = crearSock()
  await letra.execute(sock, MSG, ['cancion'], { config })
  assert.ok(sock.enviados.length > 1 && sock.enviados.length <= 3)
  assert.ok(sock.enviados[0].text.startsWith('🎤 *Canción*'))
  assert.ok(sock.enviados.every((m) => m.text.length < 4200))
  assert.ok(sock.enviados.at(-1).text.includes('recortada'))
})

test('.letra sin texto explica cómo usarlo', async () => {
  const sock = crearSock()
  await letra.execute(sock, MSG, [], { config })
  assert.ok(sock.enviados[0].text.includes('letra'))
})

test('.ss valida el enlace y envía la imagen', async () => {
  const { normalizarUrl } = ss._internos
  assert.equal(normalizarUrl('google.com'), 'https://google.com/')
  assert.equal(normalizarUrl('http://localhost'), null)
  assert.equal(normalizarUrl('no es url'), null)

  globalThis.fetch = async (entrada) => {
    const u = String(entrada)
    if (u.includes('/tools/ssweb')) return new Response(JSON.stringify(ok({ download: 'https://api.urlbox.io/x/png' })))
    if (u.startsWith('https://api.urlbox.io')) return new Response(new Uint8Array([1, 2, 3]))
    return new Response('?', { status: 404 })
  }
  const sock = crearSock()
  await ss.execute(sock, MSG, ['google.com'], { config })
  const imagen = sock.enviados.find((m) => m.image)
  assert.deepEqual([...imagen.image], [1, 2, 3])
})
