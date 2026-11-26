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

test('firmaSticker: paquete de varias líneas con bot, solicitante, lugar y creador', async () => {
  const { firmaSticker, negritaCursiva } = await import('../nucleo/stickers.js')
  assert.equal(negritaCursiva('Yui-1'), '𝒀𝒖𝒊-1')
  const f = firmaSticker({ bot: 'Yui', solicitante: 'Anali', lugar: 'Mi grupo', tipo: 'sonido', segundos: 17.6, ahora: new Date('2026-11-26T12:00:00Z') })
  assert.equal(f.pack.split('\n').length, 6)
  assert.match(f.pack, /Pedido por: Anali/); assert.match(f.pack, /Creado en: Mi grupo/); assert.match(f.pack, /26\/11\/26 · 🔊 Con sonido · ⏱ 18s/)
  assert.equal(f.autor, '👑 AmilcarGit ✓')
  const propio = firmaSticker({ bot: 'Yui', solicitante: 'Anali', pack: 'Mi pack', autor: 'Yo' })
  assert.equal(propio.pack, '✨ Mi pack ✨'); assert.equal(propio.autor, 'Yo')
})

test('resolverCanal: id, números o enlace', async () => {
  const { resolverCanal } = await import('../habilidades/stickers/_comun.js')
  assert.equal(await resolverCanal({}, '120363123456789012@newsletter'), '120363123456789012@newsletter')
  assert.equal(await resolverCanal({}, '120363123456789012'), '120363123456789012@newsletter')
  const sock = { newsletterMetadata: async (tipo, codigo) => ({ id: tipo === 'invite' && codigo === 'AbC-1' ? '1203@newsletter' : null }) }
  assert.equal(await resolverCanal(sock, 'https://whatsapp.com/channel/AbC-1'), '1203@newsletter')
  await assert.rejects(resolverCanal({}, 'hola'), /enlace del canal/)
})
