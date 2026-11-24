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

test('ytmp4 prueba Nexora y, si no hay enlace, YOSOYO', async () => {
  const original = globalThis.fetch
  const urls = []
  const respuestas = {
    nexora: { status: true, data: { download: 'https://x.test/n.mp4' } },
    nexoraMal: { status: false, message: 'No se pudo obtener el video con esa calidad' },
    yosoyo: { result: [{ title: 'S', downloads: { mp4: { url: '' }, v2: { download: { mp4: 'https://x.test/y.mp4' } } } }] },
    yosoyoVacio: { result: [{ title: 'S', downloads: { mp4: { url: '' } }, download: { mp4: '' } }] }
  }
  const usar = (n, y) => { globalThis.fetch = async u => { urls.push(String(u)); return { ok: true, status: 200, json: async () => (String(u).includes('nexora') ? n : y) } } }
  try {
    usar(respuestas.nexora, respuestas.yosoyo)
    assert.equal((await ytmp4('https://youtu.be/a')).url, 'https://x.test/n.mp4')
    assert.match(urls.at(-1), /ytmp4\?url=.*&format=360p&apikey=nexora_/)
    usar(respuestas.nexoraMal, respuestas.yosoyo)
    assert.equal((await ytmp4('https://youtu.be/a')).url, 'https://x.test/y.mp4')
    usar(respuestas.nexoraMal, respuestas.yosoyoVacio)
    await assert.rejects(ytmp4('https://youtu.be/a'), /calidad/)
  } finally { globalThis.fetch = original }
})

test('si la API falla una vez, se reintenta', async () => {
  const original = globalThis.fetch
  let n = 0
  globalThis.fetch = async () => ({ ok: true, status: 200, json: async () => (++n === 1 ? { status: false, message: 'Error al consultar YouTube' } : { status: true, data: [{ type: 'video', url: 'https://youtu.be/a', title: 'T' }] }) })
  try { assert.equal((await buscarYoutube('x')).length, 1); assert.equal(n, 2) } finally { globalThis.fetch = original }
})

test('reconoce enlaces de YouTube y limita a una descarga por persona', () => {
  assert.ok(esEnlaceYoutube('https://www.youtube.com/watch?v=1') && esEnlaceYoutube('youtu.be/1'))
  assert.ok(!esEnlaceYoutube('hola') && !esEnlaceYoutube(undefined))
  assert.ok(tomar('51'))
  assert.ok(!tomar('51'))
  soltar('51')
  assert.ok(tomar('51')); soltar('51')
})

test('yts con botones manda la imagen del primer resultado y un desplegable de audio y video', async () => {
  const original = globalThis.fetch
  globalThis.fetch = async () => ({ ok: true, status: 200, json: async () => ({ status: true, data: [{ type: 'video', url: 'https://youtu.be/-qvYXZOUImo', title: 'Patadas', duration: '3:45', author: { name: 'LM' } }] }) })
  try {
    const { default: yts } = await import('../habilidades/descargas/yts.js')
    const enviados = []
    await yts.ejecutar({}, {}, { prefijo: '.', args: ['patadas'], botonesActivos: true, responder: t => enviados.push(['txt', t]), botones: (t, l, o) => enviados.push(['btn', t, l, o]) })
    const [tipo, texto, lista, opciones] = enviados[0]
    assert.equal(tipo, 'btn')
    assert.ok(texto.length < 60, 'texto corto')
    assert.equal(opciones.media, 'https://i.ytimg.com/vi/-qvYXZOUImo/hqdefault.jpg')
    assert.deepEqual(lista[0].secciones.map(s => s.titulo), ['🎵 Música (MP3)', '🎬 Video (MP4)'])
    assert.equal(lista[0].secciones[1].filas[0].cmd, 'ytmp4 https://youtu.be/-qvYXZOUImo')
  } finally { globalThis.fetch = original }
})

test('ytmp4Local usa yt-dlp si está instalado y devuelve null si no', async () => {
  const fs = await import('fs'), os = await import('os'), path = await import('path')
  const bin = fs.mkdtempSync(path.join(os.tmpdir(), 'falso-'))
  const original = process.env.PATH
  try {
    const mod = await import('../nucleo/descargas.js?sin')
    process.env.PATH = bin   // sin yt-dlp
    assert.equal(await mod.ytmp4Local('https://youtu.be/a'), null)
    fs.writeFileSync(path.join(bin, 'yt-dlp'), '#!/bin/sh\nif [ "$1" = "--version" ]; then echo 2026.1.1; exit 0; fi\nfor a in "$@"; do last="$a"; done\nout=""; prev=""; for a in "$@"; do if [ "$prev" = "-o" ]; then out="$a"; fi; prev="$a"; done\nf=$(echo "$out" | sed "s/%(id)s/abc/; s/%(ext)s/mp4/")\necho "datos" > "$f"\necho "Mi video"\necho "$f"\n', { mode: 0o755 })
    const mod2 = await import('../nucleo/descargas.js?con')
    process.env.PATH = `${bin}:${original}`
    const r = await mod2.ytmp4Local('https://youtu.be/a')
    assert.equal(r.titulo, 'Mi video')
    assert.ok(fs.existsSync(r.archivo))
    mod2.limpiarLocal(r)
    assert.ok(!fs.existsSync(r.archivo))
  } finally { process.env.PATH = original }
})

test('la búsqueda usa YOSOYO primero y Nexora si falla', async () => {
  const original = globalThis.fetch
  const urls = []
  const yosoyo = { result: [{ title: 'A', videoUrl: 'https://youtube.com/watch?v=aaaaaaaaaaa', thumbnailUrl: 'm', channelName: 'C', duration: '3:45', views: 5 }, { title: 'sin duración', videoUrl: 'https://youtube.com/watch?v=bbbbbbbbbbb', duration: '' }] }
  const nexora = { status: true, data: [{ type: 'video', url: 'https://youtu.be/n', title: 'N', duration: '1:00', author: { name: 'X' } }] }
  const usar = (y) => { globalThis.fetch = async u => { urls.push(String(u)); const esY = String(u).includes('yosoyyo'); if (esY && !y) throw new Error('caída'); return { ok: true, status: 200, json: async () => (esY ? y : nexora) } } }
  try {
    usar(yosoyo)
    const r = await buscarYoutube('x')
    assert.deepEqual(r.map(v => v.titulo), ['A'])
    assert.ok(urls.every(u => u.includes('yosoyyo')), 'no gasta cuota de Nexora')
    urls.length = 0; usar(null)
    assert.equal((await buscarYoutube('x'))[0].titulo, 'N')
  } finally { globalThis.fetch = original }
})
