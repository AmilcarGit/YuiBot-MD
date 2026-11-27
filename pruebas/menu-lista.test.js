// Código Oficial de YuiBot-MD.by AmilcarGit
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { ICONOS, resumen } from '../habilidades/general/menu.js'

test('resumen deja solo lo que hace el comando, sin el ejemplo de uso', () => {
  assert.equal(resumen('El clima de una ciudad: .clima Lima (o .clima Madrid, España)'), 'El clima de una ciudad')
  assert.equal(resumen('Muestra todos los comandos'), 'Muestra todos los comandos')
  assert.equal(resumen('Texto a voz (nota de voz): .tts hola amigos'), 'Texto a voz (nota de voz)')
  assert.equal(resumen(undefined), '')
})

test('cada comando tiene icono y un resumen que cabe en el desplegable de WhatsApp (72 letras)', async () => {
  const raiz = path.resolve('habilidades'); const sin = []
  for (const cat of fs.readdirSync(raiz)) {
    for (const f of fs.readdirSync(path.join(raiz, cat)).filter(x => x.endsWith('.js') && !x.startsWith('_'))) {
      const h = (await import(pathToFileURL(path.join(raiz, cat, f)).href)).default
      if (!h?.nombre) continue
      assert.ok(resumen(h.ayuda).length <= 72, `${h.nombre}: ${resumen(h.ayuda)}`)
      assert.doesNotMatch(resumen(h.ayuda), /\s\.\w+/, h.nombre)
      if (!ICONOS[h.nombre]) sin.push(h.nombre)
    }
  }
  assert.deepEqual(sin, [], `sin icono: ${sin.join(', ')}`)
})
