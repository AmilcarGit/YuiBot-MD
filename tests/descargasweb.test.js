// Descargas de redes, archivos y páginas (con red simulada).
const test = require('node:test')
const assert = require('node:assert/strict')
const path = require('path')
const { respaldar } = require('./_util')

const restaurar = respaldar([path.join(__dirname, '..', 'data', 'autolink.json')])
test.after(() => restaurar())

const config = require('../defaults')
const dw = require('../lib/descargaWeb')

const resp = (cuerpo, { status = 200, headers = {} } = {}) => ({
  ok: status < 400, status,
  headers: { get: (k) => headers[k.toLowerCase()] ?? null },
  json: async () => (typeof cuerpo === 'string' ? JSON.parse(cuerpo) : cuerpo),
  text: async () => (typeof cuerpo === 'string' ? cuerpo : JSON.stringify(cuerpo)),
  arrayBuffer: async () => { const b = Buffer.isBuffer(cuerpo) ? cuerpo : Buffer.from(typeof cuerpo === 'string' ? cuerpo : JSON.stringify(cuerpo)); return b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength) },
})

function simular(rutas) {
  const original = globalThis.fetch
  const llamadas = []
  globalThis.fetch = async (url) => {
    llamadas.push(String(url))
    for (const [frag, r] of rutas) if (String(url).includes(frag)) return typeof r === 'function' ? r(String(url)) : r
    return resp('no', { status: 404 })
  }
  return { llamadas, restaurar: () => { globalThis.fetch = original } }
}

function crearSock() {
  const enviados = []
  return { enviados, sendMessage: async (j, c, o) => { enviados.push({ j, ...c, o }); return {} }, groupMetadata: async () => ({ participants: [] }) }
}
const msg = (texto = '') => ({ key: { remoteJid: 'chat@g.us', participant: '51900000001@s.whatsapp.net' }, message: { conversation: texto } })
const sinNegrita = (t) => Array.from(String(t), (ch) => {
  const c = ch.codePointAt(0)
  if (c >= 0x1d5d4 && c <= 0x1d5ed) return String.fromCharCode(65 + c - 0x1d5d4)
  if (c >= 0x1d5ee && c <= 0x1d607) return String.fromCharCode(97 + c - 0x1d5ee)
  if (c >= 0x1d7ec && c <= 0x1d7f5) return String.fromCharCode(48 + c - 0x1d7ec)
  return ch
}).join('')

test('detectarSitio y extraerUrl reconocen enlaces de cada sitio', () => {
  const casos = {
    'https://x.com/usuario/status/123': 'twitter', 'https://twitter.com/a/status/9?s=20': 'twitter',
    'https://www.threads.net/@u/post/ABC': 'threads', 'https://www.reddit.com/r/memes/comments/abc/t/': 'reddit',
    'https://pin.it/abc': 'pinterest', 'https://www.pinterest.com/pin/123/': 'pinterest',
    'https://vm.tiktok.com/abc': 'tiktok', 'https://www.instagram.com/reel/abc/': 'instagram',
    'https://youtu.be/abc': 'youtube', 'https://www.mediafire.com/file/abc/a.zip/file': 'mediafire',
    'https://drive.google.com/file/d/1AbCdEfGhIjK/view': 'gdrive', 'https://mega.nz/file/abc#key': 'mega',
    'https://github.com/AmilcarGit/YuiBot-MD': 'github',
  }
  for (const [url, clave] of Object.entries(casos)) assert.equal(dw.detectarSitio(url)?.clave, clave, url)
  assert.equal(dw.detectarSitio('https://google.com'), null)
  assert.equal(dw.extraerUrl('mira esto (https://x.com/a/status/1). genial'), 'https://x.com/a/status/1')
  assert.equal(dw.extraerUrl('sin enlace'), null)
})

test('urlSegura rechaza direcciones locales y privadas', () => {
  assert.ok(dw.urlSegura('https://example.com/a'))
  assert.ok(dw.urlSegura('example.com'))
  for (const mala of ['http://localhost:3000', 'http://127.0.0.1', 'http://192.168.1.5/x', 'http://10.0.0.2', 'http://172.20.1.1', 'ftp://example.com', 'http://intranet', 'http://[::1]/', 'http://169.254.169.254/latest']) {
    assert.equal(dw.urlSegura(mala), null, mala)
  }
})

test('twitter usa fxtwitter: fotos y videos', async () => {
  const red = simular([['api.fxtwitter.com/usuario/status/55', resp({ tweet: { text: 'hola', author: { screen_name: 'usuario' }, media: { all: [{ type: 'photo', url: 'https://pbs.twimg.com/a.jpg' }, { type: 'video', url: 'https://video.twimg.com/b.mp4' }] } } })], ['twimg.com', resp(Buffer.from('datos'))]])
  try {
    const r = await dw.twitter('https://x.com/usuario/status/55')
    assert.equal(r.medios.length, 2)
    assert.deepEqual(r.medios.map((m) => m.tipo), ['imagen', 'video'])
    assert.equal(r.autor, 'usuario')
    const sock = crearSock()
    await dw.enviarResultado(sock, msg(), 'chat@g.us', r, { sitioInfo: dw.SITIOS[0] })
    assert.ok(sock.enviados[0].image && sock.enviados[0].caption.length)
    assert.ok(sock.enviados[1].video && !sock.enviados[1].caption)
  } finally { red.restaurar() }
})

test('twitter sin medios avisa claro', async () => {
  const red = simular([['api.fxtwitter.com', resp({ tweet: { text: 'solo texto', media: {} } })]])
  try { await assert.rejects(dw.twitter('https://x.com/u/status/1'), /no tiene fotos/) } finally { red.restaurar() }
})

test('metaPagina lee Open Graph y threads/pinterest caen a la imagen de la página', async () => {
  const html = '<html><head><title>Pin</title><meta property="og:title" content="Gatito &amp; amigos"><meta content="https://i.pinimg.com/236x/ab/cd.jpg" property="og:image"></head></html>'
  const m = dw._internos.metaPagina(html)
  assert.equal(m.titulo, 'Gatito & amigos')
  assert.equal(m.imagen, 'https://i.pinimg.com/236x/ab/cd.jpg')
  const red = simular([['pin.it/abc', resp(html)], ['i.pinimg.com', resp(Buffer.from('img'))]])
  try {
    const r = await dw.descargar('pinterest', 'https://pin.it/abc')
    assert.equal(r.medios[0].tipo, 'imagen')
    assert.ok(red.llamadas.some((u) => u.includes('/originals/')), 'pide la versión grande')
  } finally { red.restaurar() }
})

test('mediafire encuentra el enlace directo (normal y cifrado)', async () => {
  for (const boton of ['<a href="https://download1.mediafire.com/xyz/doc.zip">', `<a data-scrambled-url="${Buffer.from('https://download2.mediafire.com/q/doc.zip').toString('base64')}">`]) {
    const red = simular([['mediafire.com/file', resp(`<div class="filename">doc.zip</div>${boton}`)], ['download', resp(Buffer.from('zipdata'))]])
    try {
      const r = await dw.mediafire('https://www.mediafire.com/file/abc/doc.zip/file')
      assert.equal(r.nombre, 'doc.zip')
      assert.equal(r.mime, 'application/zip')
      assert.equal(r.buffer.toString(), 'zipdata')
    } finally { red.restaurar() }
  }
  const red = simular([['mediafire.com', resp('<html>borrado</html>')]])
  try { await assert.rejects(dw.mediafire('https://www.mediafire.com/file/x/y'), /No encontré el botón/) } finally { red.restaurar() }
})

test('bajarBuffer respeta el límite de peso', async () => {
  const red = simular([['grande', resp(Buffer.from('x'), { headers: { 'content-length': String(500 * 1048576) } })], ['mentira', resp(Buffer.alloc(2 * 1048576))]])
  try {
    await assert.rejects(dw._internos.bajarBuffer('https://a.com/grande', { nombre: 'El archivo' }), /pesa 500 MB/)
    await assert.rejects(dw._internos.bajarBuffer('https://a.com/mentira', { limiteMB: 1 }), /límite es 1 MB/)
  } finally { red.restaurar() }
})

test('gdrive: lee nombre, y avisa si el archivo es privado', async () => {
  const red = simular([['drive.usercontent.google.com', resp(Buffer.from('pdf'), { headers: { 'content-type': 'application/pdf', 'content-disposition': `attachment; filename="tarea.pdf"; filename*=UTF-8''tarea%20final.pdf` } })]])
  try {
    const r = await dw.gdrive('https://drive.google.com/file/d/1AbCdEfGhIjKlM/view')
    assert.equal(r.nombre, 'tarea final.pdf')
  } finally { red.restaurar() }
  const privado = simular([['drive.usercontent', resp('<html>login</html>', { headers: { 'content-type': 'text/html' } })]])
  try { await assert.rejects(dw.gdrive('https://drive.google.com/file/d/1AbCdEfGhIjKlM/view'), /privado/) } finally { privado.restaurar() }
  await assert.rejects(dw.gdrive('https://drive.google.com/drive/folders/abc'), /ID del archivo/)
})

test('github acepta dueño/repo, enlaces y ramas; errores claros', async () => {
  const red = simular([['api.github.com/repos/AmilcarGit/YuiBot-MD', resp({ default_branch: 'main', size: 100, stargazers_count: 7, description: 'bot' })], ['api.github.com/repos/no/existe', resp('x', { status: 404 })], ['codeload.github.com', resp(Buffer.from('zip'))]])
  try {
    for (const entrada of ['AmilcarGit/YuiBot-MD', 'https://github.com/AmilcarGit/YuiBot-MD', 'https://github.com/AmilcarGit/YuiBot-MD.git']) {
      const r = await dw.github(entrada)
      assert.equal(r.nombre, 'YuiBot-MD-main.zip')
    }
    const rama = await dw.github('https://github.com/AmilcarGit/YuiBot-MD/tree/dev')
    assert.equal(rama.nombre, 'YuiBot-MD-dev.zip')
    await assert.rejects(dw.github('no/existe'), /no existe o es privado/)
    await assert.rejects(dw.github('???'), /dueño\/repo/)
  } finally { red.restaurar() }
})

test('npm: nombre, versión y alcance', async () => {
  const red = simular([['registry.npmjs.org/lodash/4.17.21', resp({ name: 'lodash', version: '4.17.21', license: 'MIT', description: 'util', dist: { tarball: 'https://registry.npmjs.org/lodash/-/lodash-4.17.21.tgz' } })], ['registry.npmjs.org/@types%2Fnode/latest', resp({ name: '@types/node', version: '20.0.0', dist: { tarball: 'https://registry.npmjs.org/@types/node/-/node-20.0.0.tgz' } })], ['.tgz', resp(Buffer.from('tgz'))]])
  try {
    assert.equal((await dw.npm('lodash@4.17.21')).nombre, 'lodash-4.17.21.tgz')
    assert.equal((await dw.npm('@types/node')).nombre, 'types-node-20.0.0.tgz')
    await assert.rejects(dw.npm('inexistente-paquete'), /No encontré ese paquete/)
    await assert.rejects(dw.npm('malo nombre!'), /no válido/)
  } finally { red.restaurar() }
})

test('extraerTexto limpia menús y scripts y webtext devuelve título y texto', async () => {
  const html = `<html><head><title>Mi artículo</title><script>var x=1</script></head><body><nav>Inicio | Contacto</nav><article><h1>Hola</h1><p>Este es un párrafo largo de prueba &amp; con entidades.</p><p>Segundo párrafo también bastante largo para pasar el mínimo.</p></article><footer>pie</footer></body></html>`
  const t = dw._internos.extraerTexto(html)
  assert.ok(t.includes('Este es un párrafo') && t.includes('&') && !t.includes('Contacto') && !t.includes('var x') && !t.includes('pie'))
  const red = simular([['ejemplo.com', resp(html)]])
  try {
    const r = await dw.webtext('https://ejemplo.com/a')
    assert.equal(r.titulo, 'Mi artículo')
    await assert.rejects(simular([['vacia.com', resp('<html><body>hi</body></html>')]]) && dw.webtext('https://vacia.com'), /texto legible/)
  } finally { red.restaurar() }
})

test('wayback: copia cercana, sin copias y guardar', async () => {
  const red = simular([['archive.org/wayback/available?url=https%3A%2F%2Fa.com&timestamp=2019', resp({ archived_snapshots: { closest: { available: true, url: 'http://web.archive.org/web/20190315000000/https://a.com', timestamp: '20190315000000' } } })], ['wayback/available', resp({ archived_snapshots: {} })], ['web.archive.org/save', resp('ok', { headers: { 'content-location': '/web/20261027/https://b.com' } })]])
  try {
    const r = await dw.wayback('https://a.com', { fecha: '2019' })
    assert.equal(r.fecha, '15/03/2019')
    assert.ok(r.url.startsWith('https://'))
    assert.equal(await dw.wayback('https://nada.com'), null)
    const g = await dw.wayback('https://b.com', { guardar: true })
    assert.ok(g.guardada && g.url.includes('/web/20261027/'))
  } finally { red.restaurar() }
})

// ── Comandos ──────────────────────────────────────────────────────────
const cmd = (n) => require(`../modulos/download/${n}`)

test('los comandos explican el uso y validan el sitio', async () => {
  for (const n of ['twitter', 'threads', 'reddit', 'pindl', 'likee', 'mediafire', 'gdrive', 'megadl', 'gitclone', 'npmdl', 'webtext', 'wayback']) {
    const sock = crearSock()
    await cmd(n).execute(sock, msg(), [], { config, commands: new Map() })
    assert.ok(sock.enviados[0].text.length > 10, n)
  }
  const sock = crearSock()
  await cmd('twitter').execute(sock, msg(), ['https://youtube.com/watch?v=1'], { config })
  assert.ok(sock.enviados[0].text.includes('no parece ser de'))
  const s2 = crearSock()
  await cmd('webtext').execute(s2, msg(), ['http://127.0.0.1/admin'], { config })
  assert.ok(sinNegrita(s2.enviados[0].text).toLowerCase().includes('enlace'))
})

test('.twitter descarga y envía de punta a punta', async () => {
  const red = simular([['api.fxtwitter.com', resp({ tweet: { text: 'x', author: { screen_name: 'u' }, media: { all: [{ type: 'photo', url: 'https://pbs.twimg.com/a.jpg' }] } } })], ['twimg.com', resp(Buffer.from('foto'))]])
  try {
    const sock = crearSock()
    await cmd('twitter').execute(sock, msg(), ['https://x.com/u/status/1'], { config })
    assert.ok(sock.enviados.some((e) => Buffer.isBuffer(e.image)))
  } finally { red.restaurar() }
})

test('.mediafire y errores de red salen como mensaje, sin romper', async () => {
  const red = simular([['mediafire.com', () => { throw new Error('sin conexión') }]])
  const log = console.error; console.error = () => {}
  try {
    const sock = crearSock()
    await cmd('mediafire').execute(sock, msg(), ['https://www.mediafire.com/file/a/b'], { config })
    assert.ok(sock.enviados.at(-1).text.includes('No pude descargarlo'))
  } finally { console.error = log; red.restaurar() }
})

test('.dl delega en los comandos existentes, resuelve las redes y lista los sitios', async () => {
  const llamados = []
  const commands = new Map([['tiktok', { execute: async (s, m, a) => llamados.push(['tiktok', a]) }], ['ytmp3', { execute: async (s, m, a) => llamados.push(['ytmp3', a]) }], ['youtube', { execute: async (s, m, a) => llamados.push(['youtube', a]) }]])
  const dl = cmd('dl')
  const sock = crearSock()
  await dl.execute(sock, msg(), ['https://vm.tiktok.com/abc'], { config, commands })
  await dl.execute(sock, msg(), ['https://youtu.be/abc', 'audio'], { config, commands })
  await dl.execute(sock, msg(), ['https://youtu.be/abc'], { config, commands })
  assert.deepEqual(llamados, [['tiktok', ['https://vm.tiktok.com/abc']], ['ytmp3', ['https://youtu.be/abc']], ['youtube', ['https://youtu.be/abc']]])
  await dl.execute(sock, msg(), [], { config, commands })
  assert.ok(sock.enviados.at(-1).text.includes('MediaFire') && sock.enviados.at(-1).text.includes('X / Twitter'))
  await dl.execute(sock, msg(), ['http://192.168.0.1/x'], { config, commands })
  assert.ok(sock.enviados.at(-1).text.includes('privada'))
})

test('.autolink: activa por chat y ofrece botones solo en enlaces soportados', async () => {
  const autolink = cmd('autolink')
  const sock = crearSock()
  sock.groupMetadata = async () => ({ participants: [{ id: '51900000001@s.whatsapp.net', admin: 'admin' }] })
  const ctx = (body) => ({ jid: 'chat@g.us', body, config })
  await autolink.onMessage(sock, msg('https://x.com/u/status/1'), ctx('https://x.com/u/status/1'))
  assert.equal(sock.enviados.length, 0, 'apagado por defecto')

  await autolink.execute(sock, msg(), ['on'], { config })
  assert.ok(sock.enviados.at(-1).text.includes('activado'))
  sock.enviados.length = 0

  const enlace = 'https://x.com/u/status/777'
  await autolink.onMessage(sock, msg(enlace), ctx(`mira ${enlace}`))
  assert.equal(sock.enviados.length, 1)
  const botones = sock.enviados[0].buttons
  assert.equal(botones[0].id, `${config.PREFIXES[0]}dl ${enlace}`)
  assert.equal(botones[1].id, `${config.PREFIXES[0]}dl ${enlace} audio`)

  await autolink.onMessage(sock, msg(enlace), ctx(enlace)) // mismo enlace: sin repetir
  await autolink.onMessage(sock, msg('hola'), ctx('hola sin enlace'))
  await autolink.onMessage(sock, msg(), ctx(`${config.PREFIXES[0]}dl ${enlace}`)) // un comando no se repite
  await autolink.onMessage(sock, msg(), ctx('https://open.spotify.com/track/abc'))
  assert.equal(sock.enviados.length, 2)
  assert.equal(sock.enviados[1].buttons.length, 1, 'Spotify: solo "Descargar"')

  // un miembro normal no puede cambiarlo
  const normal = crearSock(); normal.groupMetadata = async () => ({ participants: [] })
  await autolink.execute(normal, msg(), ['off'], { config })
  assert.ok(normal.enviados[0].text.includes('administradores'))
  await autolink.execute(sock, msg(), ['off'], { config })
  assert.ok(sock.enviados.at(-1).text.includes('desactivado'))
})
