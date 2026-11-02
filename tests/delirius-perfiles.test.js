const test = require('node:test')
const assert = require('node:assert/strict')
const delirius = require('../lib/delirius')

const { almacenRutas } = delirius._internos
const respaldo = JSON.stringify(almacenRutas.leer())
test.after(() => almacenRutas.guardar(JSON.parse(respaldo)))

// Falso servidor: solo responde bien en `ruta` con el parámetro `param`.
function falso(ruta, param, cuerpo) {
  const llamadas = []
  const fn = async (url) => {
    llamadas.push(url)
    const u = new URL(url)
    const ok = u.pathname === ruta && (param === null || u.searchParams.has(param))
    return { ok, status: ok ? 200 : 404, json: async () => cuerpo }
  }
  fn.llamadas = llamadas
  return fn
}

test('roblox: encuentra la ruta, adapta y la recuerda', async () => {
  almacenRutas.guardar({})
  const cuerpo = { status: true, data: { id: 1, username: 'nayeonyny', name: 'nayeonyny', followers: 170163, followings: 0, friends: 9, hasVerified: false, isBanned: false, gamesCreated: [{ gameId: 2, name: 'X', playing: 3 }], extraInfo: { accountStatus: 'Activo' } } }
  const f = falso('/tools/robloxstalk', 'user', cuerpo)
  const p = await delirius.robloxPerfil('nayeonyny', f)
  assert.equal(p.usuario, 'nayeonyny'); assert.equal(p.seguidores, 170163); assert.equal(p.juegos[0].jugando, 3)
  assert.deepEqual(almacenRutas.leer().robloxstalk, { ruta: '/tools/robloxstalk', param: 'user' })
  const g = falso('/tools/robloxstalk', 'user', cuerpo)
  await delirius.robloxPerfil('x', g)
  assert.equal(new URL(g.llamadas[0]).pathname, '/tools/robloxstalk') // la recordada va primero
})

test('tiktok: lee result.users y result.stats', async () => {
  almacenRutas.guardar({})
  const f = falso('/stalk/tiktok', 'username', { status: true, result: { users: { username: 'twice', nickname: 'TWICE', verified: true }, stats: { followerCount: 31200000, videoCount: 1577 } } })
  const p = await delirius.tiktokPerfil('@twice', f)
  assert.equal(p.seguidores, 31200000); assert.equal(p.verificado, true)
})

test('instagram: reconoce el formato y limpia los guiones', async () => {
  almacenRutas.guardar({})
  const f = falso('/tools/igstalk', 'username', { status: true, data: { username: 'ig', full_name: '-', biography: 'hola', followers: '10', following: '2', posts: '1', private: false, verified: true } })
  const p = await delirius.instagramPerfil('ig', f)
  assert.equal(p.nombre, ''); assert.equal(p.bio, 'hola'); assert.equal(p.verificado, true)
})

test('minecraft: decodifica entidades HTML y manda page', async () => {
  almacenRutas.guardar({})
  const f = falso('/search/minecraftnews', null, { status: true, page: 1, total: 3034, data: [{ title: 'A &amp; B', description: 'Don&#39;t', author: 'X', type: 'News', published: '10/30/2026', url: 'https://m.net/a', image: 'https://m.net/i.jpg' }] })
  const r = await delirius.minecraftNoticias(2, f)
  assert.equal(r.noticias[0].titulo, 'A & B'); assert.equal(r.noticias[0].resumen, "Don't"); assert.equal(r.total, 3034)
  assert.match(f.llamadas.find((u) => new URL(u).pathname === '/search/minecraftnews'), /page=2/)
})

test('anime MAL: adapta payload', async () => {
  almacenRutas.guardar({})
  const f = falso('/search/myanimelist', 'q', { status: true, data: [{ id: 20, type: 'anime', name: 'Naruto', url: 'u', image_url: 'i', payload: { media_type: 'TV', start_year: 2002, score: '8.03', status: 'Finished Airing' } }] })
  const l = await delirius.buscarAnimeMAL('naruto', f)
  assert.equal(l[0].nombre, 'Naruto'); assert.equal(l[0].puntuacion, '8.03'); assert.equal(l[0].anio, 2002)
})

test('si ninguna ruta responde, el error es claro y no revienta', async () => {
  almacenRutas.guardar({})
  await assert.rejects(delirius.buscarAnimeMAL('x', async () => { throw new Error('red') }), /formato esperado/)
  await assert.rejects(delirius.buscarAnimeMAL('x', async () => ({ ok: true, json: async () => ({ status: false, message: 'Sin resultados' }) })), /Sin resultados/)
})
