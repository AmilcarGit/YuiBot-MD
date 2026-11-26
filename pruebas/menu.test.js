// Código Oficial de YuiBot-MD.by AmilcarGit
import test from 'node:test'
import assert from 'node:assert/strict'
import { menuCompacto } from '../habilidades/general/menu.js'
import { temaPara } from '../estilo/index.js'

test('el menú con botones es corto y muestra 3 comandos de muestra por categoría', () => {
  const nombres = n => Array.from({ length: n }, (_, i) => `cmd${i}`)
  const texto = menuCompacto({
    tema: temaPara('navidad'), nombre: 'Anali', prefijo: '.', total: 38,
    categorias: [{ clave: 'general', titulo: 'General', nombres: nombres(6) }, { clave: 'juegos', titulo: 'Juegos', nombres: nombres(2) }]
  })
  assert.match(texto, /Anali/); assert.match(texto, /Prefijo: \*\.\*/); assert.match(texto, /cmd0 · cmd1 · cmd2 \+3/); assert.match(texto, /Toca \*📜 Comandos\*/)
  assert.ok(texto.split('\n').length <= 20)
  console.log(texto)
})
