// Código Oficial de YuiBot-MD.by AmilcarGit
import test from 'node:test'
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { ajuste, aWebp, hayFfmpeg } from '../nucleo/stickers.js'

test('el filtro "recorte" corta un cuadrado desde el centro y "completo" rellena con transparencia', () => {
  assert.match(ajuste('recorte'), /force_original_aspect_ratio=increase.*crop=512:512/)
  assert.doesNotMatch(ajuste('recorte'), /pad=/)
  assert.match(ajuste('completo'), /force_original_aspect_ratio=decrease.*pad=512:512.*0x00000000/)
})

test('un video ancho se convierte en sticker 512×512 en ambos modos', async t => {
  if (!(await hayFfmpeg())) return t.skip('sin ffmpeg')
  const ancha = execFileSync('ffmpeg', ['-v', 'error', '-f', 'lavfi', '-i', 'color=c=red:s=400x100:d=1', '-frames:v', '1', '-f', 'image2', '-c:v', 'png', '-'], { maxBuffer: 1 << 24 })
  for (const modo of ['recorte', 'completo']) {
    const w = await aWebp(ancha, { modo })
    assert.equal(w.toString('ascii', 8, 12), 'WEBP', modo)
  }
})
