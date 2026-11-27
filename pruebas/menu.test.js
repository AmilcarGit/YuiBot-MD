// Código Oficial de YuiBot-MD.by AmilcarGit
import test from 'node:test'
import assert from 'node:assert/strict'
import { menuCompacto } from '../habilidades/general/menu.js'
import { temaPara } from '../estilo/index.js'

test('el menú con botones es una tarjeta corta con los datos de quien lo pidió', () => {
  const nombres = n => Array.from({ length: n }, (_, i) => `cmd${i}`)
  const texto = menuCompacto({
    tema: temaPara('navidad'), nombre: 'Anali', prefijo: '.', total: 38, usuario: { nivel: 3, xp: 45, monedas: 1250, racha: 4 }, ahora: new Date('2026-11-27T10:56:00Z'),
    categorias: [{ clave: 'general', titulo: 'General', nombres: nombres(6) }, { clave: 'juegos', titulo: 'Juegos', nombres: nombres(2) }]
  })
  assert.match(texto, /Anali/); assert.match(texto, /Prefijo \*\.\*/); assert.match(texto, /Nivel \*3\*/); assert.match(texto, /▰+▱+ \d+%/); assert.match(texto, /1[.,]250/); assert.match(texto, /Racha 4/); assert.match(texto, /05:56/); assert.doesNotMatch(texto, /cmd0/); assert.match(texto, /Toca \*📜 Comandos\*/)
  assert.ok(texto.split('\n').length <= 14)
  console.log(texto)
})
