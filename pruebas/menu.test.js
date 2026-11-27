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
  assert.match(texto, /Anali/); assert.match(texto, /Prefijo \*\.\*/); assert.match(texto, /Buenas madrugadas|Buenos días|Buenas tardes|Buenas noches/); assert.match(texto, /Aprendiz/); assert.match(texto, /Prueba:/); assert.match(texto, /chaty-weld\.vercel\.app/); assert.match(texto, /yuibot-datos\.vercel\.app\/yui/); assert.doesNotMatch(texto, /General 6/); assert.match(texto, /Nivel \*3\*/); assert.match(texto, /▰+▱+ \d+%/); assert.match(texto, /1[.,]250/); assert.match(texto, /Racha 4/); assert.match(texto, /05:56/); assert.match(texto, /Viernes,? 27 de noviembre/); assert.doesNotMatch(texto, /cmd0/); assert.match(texto, /Toca \*📜 Comandos\*/)
  assert.ok(texto.split('\n').length <= 22)
  console.log(texto)
})
