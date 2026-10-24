// YouTube: fuentes (yt-dlp local / API), parseo de búsqueda y descarga con un yt-dlp simulado.
const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('fs')
const os = require('os')
const path = require('path')

const config = require('../defaults')
const youtube = require('../lib/youtube')
const { ordenDeFuentes, parsearBusqueda, formatearDuracion, resumirErrorYtDlp } = youtube._internos

let carpeta
let falso

test.before(() => {
  carpeta = fs.mkdtempSync(path.join(os.tmpdir(), 'yui-test-ytdlp-'))
  falso = path.join(carpeta, 'yt-dlp-falso')
  fs.writeFileSync(falso, `#!/usr/bin/env node
const fs = require('fs'), path = require('path')
const a = process.argv.slice(2)
if (a.includes('--version')) { console.log('2099.01.01'); process.exit(0) }
const ultimo = a[a.length - 1]
if (ultimo.startsWith('ytsearch')) {
  console.log(JSON.stringify({ id: 'abc123', title: 'Cancion Uno', channel: 'Canal', duration: 125 }))
  console.log(JSON.stringify({ id: 'def456', title: 'Cancion Dos', uploader: 'Otro', duration_string: '3:00' }))
  process.exit(0)
}
if (ultimo.includes('FALLA')) { console.error('ERROR: [youtube] xyz: Video unavailable'); process.exit(1) }
const plantilla = a[a.indexOf('-o') + 1]
const ext = a.includes('-x') ? 'mp3' : 'mp4'
fs.writeFileSync(plantilla.replace('%(id)s', 'abc123').replace('%(ext)s', ext), Buffer.from('contenido-' + ext))
console.log(JSON.stringify({ id: 'abc123', title: 'Cancion Uno', channel: 'Canal', duration: 125, height: 720 }))
`)
  fs.chmodSync(falso, 0o755)
})

test.after(() => fs.rmSync(carpeta, { recursive: true, force: true }))

function conConfig(opciones, fn) {
  const antes = config.YOUTUBE
  config.YOUTUBE = { MODO: 'local', BIN: falso, MAX_MB: 100, ALTURA: 720, ...opciones }
  return Promise.resolve(fn()).finally(() => { config.YOUTUBE = antes })
}

test('ordenDeFuentes respeta el modo y la disponibilidad de yt-dlp', () => {
  assert.deepEqual(ordenDeFuentes('auto', true), ['local', 'api'])
  assert.deepEqual(ordenDeFuentes('auto', false), ['api'])
  assert.deepEqual(ordenDeFuentes('local', false), ['local'])
  assert.deepEqual(ordenDeFuentes('api', true), ['api'])
})

test('formatearDuracion y resumirErrorYtDlp', () => {
  assert.equal(formatearDuracion(125), '2:05')
  assert.equal(formatearDuracion(3725), '1:02:05')
  assert.equal(formatearDuracion(0), null)
  assert.equal(resumirErrorYtDlp('WARNING: x\nERROR: [youtube] id: Video unavailable'), 'id: Video unavailable')
})

test('parsearBusqueda adapta la salida de yt-dlp al formato de la API', () => {
  const r = parsearBusqueda('{"id":"a1","title":"T","channel":"C","duration":65}\nruido\n{"sin":"id"}')
  assert.equal(r.datos.results.videos.length, 1)
  assert.deepEqual(r.datos.results.videos[0], { title: 'T', url: 'https://www.youtube.com/watch?v=a1', channel: 'C', duration: '1:05' })
})

test('pedirBusqueda usa yt-dlp local', () => conConfig({}, async () => {
  const r = await youtube.pedirBusqueda('algo')
  assert.equal(r.datos.results.videos.length, 2)
  assert.equal(r.datos.results.videos[0].url, 'https://www.youtube.com/watch?v=abc123')
  assert.equal(r.datos.results.videos[0].duration, '2:05')
}))

test('descargarLocal audio y video devuelven el archivo y limpian la carpeta temporal', () => conConfig({}, async () => {
  const antes = fs.readdirSync(os.tmpdir()).filter((f) => f.startsWith('yui-yt-')).length
  const audio = await youtube.descargarLocal('https://youtu.be/abc123', 'audio')
  assert.equal(audio.buffer.toString(), 'contenido-mp3')
  assert.equal(audio.titulo, 'Cancion Uno')
  assert.equal(audio.duracion, '2:05')
  const video = await youtube.descargarLocal('https://youtu.be/abc123', 'video')
  assert.equal(video.buffer.toString(), 'contenido-mp4')
  assert.equal(video.calidad, '720p')
  assert.equal(fs.readdirSync(os.tmpdir()).filter((f) => f.startsWith('yui-yt-')).length, antes)
}))

test('un error de yt-dlp llega con un mensaje legible', () => conConfig({}, async () => {
  await assert.rejects(youtube.descargarLocal('https://youtu.be/FALLA', 'audio'), /Video unavailable/)
}))

test('en modo local sin yt-dlp instalado, el error explica cómo instalarlo', () => conConfig({ BIN: path.join(carpeta, 'no-existe') }, async () => {
  await assert.rejects(youtube.conFuentes({ local: () => youtube.descargarLocal('x', 'audio'), api: async () => 1 }), /yt-dlp/)
}))
