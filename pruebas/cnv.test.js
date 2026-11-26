// Código Oficial de YuiBot-MD.by AmilcarGit
import test from 'node:test'
import assert from 'node:assert/strict'
import { cnvYoutube } from '../nucleo/descargas.js'

const ENLACE = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'
function fetchFalso({ convertir, bytes = Buffer.from('ID3-audio-falso'), estado = 200 }) {
  const llamadas = []
  const f = async (url, opciones = {}) => {
    const u = String(url); llamadas.push({ url: u, opciones })
    if (u.includes('/v2/sanity/key')) return { ok: true, status: 200, text: async () => JSON.stringify({ key: 'clave-de-prueba' }) }
    if (u.includes('/v2/converter')) return { ok: true, status: 200, text: async () => JSON.stringify(convertir) }
    return { ok: estado === 200, status: estado, headers: { get: () => String(bytes.length) }, arrayBuffer: async () => bytes }
  }
  f.llamadas = llamadas
  return f
}
async function con(f, fn) { const o = globalThis.fetch; globalThis.fetch = f; try { return await fn() } finally { globalThis.fetch = o } }

test('cnv: convierte, descarga con Origin/Referer y devuelve el archivo', async () => {
  const f = fetchFalso({ convertir: { url: 'https://cdn.ejemplo.com/a.mp3', filename: 'Mi canción.mp3' } })
  const r = await con(f, () => cnvYoutube(ENLACE, 'mp3'))
  assert.equal(r.titulo, 'Mi canción'); assert.equal(r.mimetype, 'audio/mpeg'); assert.ok(r.buffer.length > 0)
  const conv = f.llamadas.find(x => x.url.includes('/v2/converter'))
  assert.match(conv.opciones.body, /format=mp3/); assert.match(conv.opciones.body, /audioBitrate=128/)
  assert.equal(conv.opciones.headers.key, 'clave-de-prueba')
  const bajada = f.llamadas.at(-1)
  assert.match(bajada.opciones.headers.Referer, /^https:\/\/(iframe\.y2meta-uk\.com|mp3yt\.is)\//)
})

test('cnv: video en MP4 y límite de tamaño', async () => {
  const f = fetchFalso({ convertir: { url: 'https://cdn.ejemplo.com/v.mp4', filename: 'v.mp4' }, bytes: Buffer.alloc(2000) })
  const r = await con(f, () => cnvYoutube(ENLACE, 'mp4', { maxBytes: 5000 }))
  assert.equal(r.mimetype, 'video/mp4')
  assert.match(f.llamadas.find(x => x.url.includes('/v2/converter')).opciones.body, /format=mp4/)
  await assert.rejects(con(fetchFalso({ convertir: { url: 'https://cdn.ejemplo.com/v.mp4' }, bytes: Buffer.alloc(2000) }), () => cnvYoutube(ENLACE, 'mp4', { maxBytes: 1000 })), /demasiado grande/)
})

test('cnv: errores claros si el conversor falla o el enlace no es de YouTube', async () => {
  await assert.rejects(con(fetchFalso({ convertir: { error: true, errorMsg: 'video privado' } }), () => cnvYoutube(ENLACE, 'mp3')), /video privado/)
  await assert.rejects(con(fetchFalso({ convertir: {} }), () => cnvYoutube('https://ejemplo.com/x', 'mp3')), /video ID/)
  await assert.rejects(con(fetchFalso({ convertir: { url: 'https://cdn.ejemplo.com/a.mp3' }, estado: 403 }), () => cnvYoutube(ENLACE, 'mp3')), /403/)
})
