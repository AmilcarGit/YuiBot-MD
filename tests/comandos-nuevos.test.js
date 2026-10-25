// APIs públicas (con respuestas simuladas con la forma real) y comandos locales.
const test = require('node:test')
const assert = require('node:assert/strict')

const publicas = require('../lib/publicas')
const bola8 = require('../modulos/diversion/bola8')
const ppt = require('../modulos/diversion/ppt')
const ship = require('../modulos/diversion/ship')
const divisa = require('../modulos/utilidad/divisa')
const config = require('../defaults')

const fetchOriginal = globalThis.fetch
test.afterEach(() => { globalThis.fetch = fetchOriginal })

function responder(cuerpo, status = 200) {
  globalThis.fetch = async () => new Response(JSON.stringify(cuerpo), { status })
}

function crearSock() {
  const enviados = []
  return { enviados, async sendMessage(jid, contenido) { enviados.push(contenido) } }
}
const MSG = (extra = {}) => ({ key: { remoteJid: '1@g.us', participant: '51111@s.whatsapp.net' }, ...extra })

test('pokemon: normaliza nombre, tipos, medidas y stats', async () => {
  responder({
    id: 25, name: 'pikachu', height: 4, weight: 60,
    types: [{ type: { name: 'electric' } }],
    abilities: [{ ability: { name: 'static' } }, { ability: { name: 'lightning-rod' } }],
    stats: [{ base_stat: 35, stat: { name: 'hp' } }, { base_stat: 55, stat: { name: 'attack' } }, { base_stat: 90, stat: { name: 'speed' } }],
    sprites: { front_default: 'https://x/f.png', other: { 'official-artwork': { front_default: 'https://x/o.png' } } },
  })
  const p = await publicas.pokemon('Pikachu')
  assert.deepEqual([p.id, p.nombre, p.tipos, p.altura, p.peso], [25, 'Pikachu', ['Electric'], 0.4, 6])
  assert.deepEqual(p.habilidades, ['Static', 'Lightning Rod'])
  assert.equal(p.stats.velocidad, 90)
  assert.equal(p.imagen, 'https://x/o.png')
})

test('un 404 se marca como noEncontrado y no se reintenta', async () => {
  let llamadas = 0
  globalThis.fetch = async () => { llamadas++; return new Response('x', { status: 404 }) }
  await assert.rejects(publicas.pokemon('noexiste'), (e) => e.noEncontrado === true)
  assert.equal(llamadas, 1)
})

test('anime: toma el primer resultado y limpia la sinopsis', async () => {
  responder({ data: [{ title: 'Naruto', title_english: 'Naruto', type: 'TV', episodes: 220, status: 'Finished Airing', year: 2002, score: 8.0, rank: 700, genres: [{ name: 'Action' }], synopsis: 'Historia. [Written by MAL Rewrite]', images: { jpg: { large_image_url: 'https://x/n.jpg' } }, url: 'https://myanimelist.net/anime/20' }] })
  const a = await publicas.anime('naruto')
  assert.equal(a.sinopsis, 'Historia.')
  assert.deepEqual([a.episodios, a.puntuacion, a.generos], [220, 8, ['Action']])
  responder({ data: [] })
  await assert.rejects(publicas.anime('zzz'), (e) => e.noEncontrado)
})

test('divisa y cripto', async () => {
  responder({ amount: 100, base: 'USD', date: '2026-10-23', rates: { PEN: 345.5 } })
  assert.equal((await publicas.divisa(100, 'USD', 'PEN')).resultado, 345.5)
  responder({ bitcoin: { usd: 70000, pen: 240000, usd_24h_change: -1.5 } })
  const c = await publicas.cripto('BTC')
  assert.deepEqual([c.id, c.usd, c.cambio24h], ['bitcoin', 70000, -1.5])
  responder({})
  await assert.rejects(publicas.cripto('xyz'), (e) => e.noEncontrado)
})

test('pais: usa los nombres en español', async () => {
  responder([{ name: { common: 'Peru', official: 'Republic of Peru' }, translations: { spa: { common: 'Perú', official: 'República del Perú' } }, capital: ['Lima'], population: 34000000, region: 'Americas', subregion: 'South America', area: 1285216, currencies: { PEN: { name: 'Peruvian sol', symbol: 'S/' } }, languages: { spa: 'Spanish', que: 'Quechua' }, flags: { png: 'https://x/pe.png' } }])
  const p = await publicas.pais('peru')
  assert.deepEqual([p.nombre, p.capital, p.region], ['Perú', 'Lima', 'Americas · South America'])
  assert.deepEqual(p.monedas, ['Peruvian sol (S/)'])
})

test('.divisa interpreta los distintos formatos', () => {
  const { interpretar } = divisa._internos
  assert.deepEqual(interpretar(['100', 'usd', 'pen']), { monto: 100, de: 'USD', a: 'PEN' })
  assert.deepEqual(interpretar(['eur']), { monto: 1, de: 'EUR', a: 'PEN' })
  assert.deepEqual(interpretar(['50,5', 'usd', 'a', 'mxn']), { monto: 50.5, de: 'USD', a: 'MXN' })
  assert.equal(interpretar([]), null)
  assert.equal(interpretar(['0', 'usd', 'pen']), null)
  assert.equal(interpretar(['dólares', 'pen']), null)
})

test('.bola8 pide una pregunta y responde con una frase de la lista', async () => {
  const sock = crearSock()
  await bola8.execute(sock, MSG(), [], { config })
  assert.ok(sock.enviados[0].text.includes('Hazme una pregunta'))
  await bola8.execute(sock, MSG(), ['¿Aprobaré?'], { config })
  assert.ok(bola8._internos.RESPUESTAS.some((r) => sock.enviados[1].text.includes(r)))
})

test('.ppt resuelve todas las combinaciones', () => {
  const { resolver, normalizar } = ppt._internos
  assert.equal(resolver('piedra', 'tijera'), 'gana')
  assert.equal(resolver('piedra', 'papel'), 'pierde')
  assert.equal(resolver('papel', 'papel'), 'empate')
  assert.equal(resolver('tijera', 'papel'), 'gana')
  assert.equal(normalizar('Piedra'), 'piedra')
  assert.equal(normalizar('TIJERAS'), 'tijera')
  assert.equal(normalizar('x'), null)
})

test('.ship: mismo par = mismo porcentaje sin importar el orden, y siempre 0-100', () => {
  const { compatibilidad, frase, barra } = ship._internos
  assert.equal(compatibilidad('51111', '51222'), compatibilidad('51222', '51111'))
  for (let i = 0; i < 200; i++) {
    const p = compatibilidad(`5${i}`, `9${i * 7}`)
    assert.ok(p >= 0 && p <= 100)
  }
  assert.ok(frase(0).includes('Ni lo intenten'))
  assert.ok(frase(100).includes('Almas'))
  assert.equal([...new Intl.Segmenter().segment(barra(50))].length, 10)
})

test('.ship con dos menciones, con una (usa al remitente) y sin ninguna', async () => {
  const sock = crearSock()
  const contexto = (mentionedJid) => ({ message: { extendedTextMessage: { contextInfo: { mentionedJid } } } })
  await ship.execute(sock, MSG(contexto(['51222@s.whatsapp.net', '51333@s.whatsapp.net'])), [], { config })
  assert.deepEqual(sock.enviados[0].mentions, ['51222@s.whatsapp.net', '51333@s.whatsapp.net'])
  await ship.execute(sock, MSG(contexto(['51222@s.whatsapp.net'])), [], { config })
  assert.deepEqual(sock.enviados[1].mentions, ['51111@s.whatsapp.net', '51222@s.whatsapp.net'])
  await ship.execute(sock, MSG(), [], { config })
  assert.ok(sock.enviados[2].text.includes('Menciona'))
})
