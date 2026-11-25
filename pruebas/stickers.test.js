// Código Oficial de YuiBot-MD.by AmilcarGit
import test from 'node:test'
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { aWebp, conMetadatos, hayFfmpeg } from '../nucleo/stickers.js'
import { buscarMedio } from '../habilidades/stickers/_comun.js'

test('buscarMedio encuentra la imagen propia y la citada', () => {
  const propio = buscarMedio({ key: { id: 'A' }, message: { imageMessage: { mimetype: 'image/jpeg' } } }, 'j@s')
  assert.equal(propio.tipo, 'imageMessage')
  const citado = buscarMedio({ key: { id: 'B' }, message: { extendedTextMessage: { text: '.s', contextInfo: { stanzaId: 'C', quotedMessage: { videoMessage: { mimetype: 'video/mp4' } } } } } }, 'j@s')
  assert.equal(citado.tipo, 'videoMessage')
  assert.equal(citado.mensaje.key.id, 'C')
  assert.equal(buscarMedio({ key: {}, message: { conversation: 'hola' } }, 'j@s'), null)
})

test('crea un sticker webp 512x512 con metadatos', async t => {
  if (!(await hayFfmpeg())) return t.skip('sin ffmpeg')
  const png = execFileSync('ffmpeg', ['-v', 'error', '-f', 'lavfi', '-i', 'color=c=pink:s=300x200', '-frames:v', '1', '-f', 'image2pipe', '-vcodec', 'png', '-'])
  const webp = conMetadatos(await aWebp(png, { animado: false }), 'Pack', 'Autor')
  assert.equal(webp.subarray(0, 4).toString(), 'RIFF')
  assert.equal(webp.subarray(8, 12).toString(), 'WEBP')
  assert.ok(webp.includes(Buffer.from('Pack')))
  assert.ok(webp.length < 300 * 1024)
})
