import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

process.env.TEMA = 'normal' // resultado estable aunque estemos en diciembre

const { fuente, temaPara, dice, caja } = await import('../estilo/index.js')
const { voz } = await import('../estilo/voz.js')
const { temas } = await import('../estilo/temas.js')

const raiz = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')

function archivosJs(carpeta) {
  return fs.readdirSync(carpeta, { withFileTypes: true }).flatMap(e => {
    const ruta = path.join(carpeta, e.name)
    if (e.isDirectory()) return e.name === 'node_modules' || e.name === 'pruebas' ? [] : archivosJs(ruta)
    return ruta.endsWith('.js') ? [ruta] : []
  })
}

test('toda frase que pide el código existe en voz.js', () => {
  const usadas = new Set(['pptEmpate', 'pptGana', 'pptPierde', 'gachaComun', 'gachaRara', 'gachaEpica',
    'gachaLegendaria', 'interruptorOn', 'interruptorOff'])
  for (const archivo of archivosJs(raiz)) {
    if (archivo.includes(`${path.sep}estilo${path.sep}`)) continue
    for (const [, clave] of fs.readFileSync(archivo, 'utf8').matchAll(/dice\('(\w+)'/g)) usadas.add(clave)
  }
  for (const clave of usadas) assert.ok(voz[clave]?.length, `falta la frase "${clave}" en estilo/voz.js`)
})

test('las frases propias de cada tema reemplazan claves que existen', () => {
  for (const [nombre, tema] of Object.entries(temas)) {
    for (const clave of Object.keys(tema.voz || {})) {
      assert.ok(voz[clave], `el tema ${nombre} define "${clave}" pero no existe en voz.js`)
    }
  }
})

test('las frases no usan marcas que WhatsApp convierte en formato', () => {
  const todas = [
    ...Object.entries(voz),
    ...Object.values(temas).flatMap(t => Object.entries(t.voz || {}))
  ]
  for (const [clave, frases] of todas) {
    for (const frase of frases) {
      const limpia = frase.replace(/\{\w+\}/g, '')
      assert.doesNotMatch(limpia, /[*_~`]/, `"${clave}" tiene * _ ~ o \` : ${frase}`)
    }
  }
})

test('fuente transforma letras y respeta lo demás', () => {
  assert.equal(fuente('Hola', 'script'), '𝓗𝓸𝓵𝓪')
  assert.equal(fuente('Hola', 'negrita'), '𝐇𝐨𝐥𝐚')
  assert.equal(fuente('Hola', 'mini'), 'ʜᴏʟᴀ')
  assert.equal(fuente('Hola', null), '*Hola*')
  assert.equal(fuente('Economía 2', 'script'), '𝓔𝓬𝓸𝓷𝓸𝓶𝓲𝓪 2')
})

test('la festividad se activa por fechas (zona de Lima)', () => {
  assert.equal(temaPara('auto', new Date('2026-12-25T15:00:00Z')).nombre, 'Navidad')
  assert.equal(temaPara('auto', new Date('2026-12-01T15:00:00Z')).nombre, 'Navidad')
  assert.equal(temaPara('auto', new Date('2027-01-06T15:00:00Z')).nombre, 'Navidad')
  assert.equal(temaPara('auto', new Date('2027-01-07T15:00:00Z')).nombre, 'Normal')
  assert.equal(temaPara('auto', new Date('2026-11-22T15:00:00Z')).nombre, 'Normal')
  assert.equal(temaPara('navidad', new Date('2026-06-01T15:00:00Z')).nombre, 'Navidad')
  assert.equal(temaPara('inventado').nombre, 'Normal')
})

test('dice rellena los huecos y deja los desconocidos', () => {
  assert.match(dice('nivelUp', { nombre: 'Ana', nivel: 7 }), /Ana/)
  assert.match(dice('nivelUp', { nombre: 'Ana', nivel: 7 }), /7/)
  assert.match(dice('nivelUp', {}), /\{nombre\}/)
  assert.equal(dice('clave-que-no-existe'), 'clave-que-no-existe')
})

test('caja dibuja marco, título y descarta filas vacías', () => {
  const texto = caja('Prueba', ['uno', false, null, 'dos\ntres'])
  const lineas = texto.split('\n')
  assert.match(lineas[0], /𝐏𝐫𝐮𝐞𝐛𝐚/)
  assert.equal(lineas.length, 5)
  assert.equal(lineas.at(-1), temas.normal.marco.pie)
  assert.ok(lineas.slice(1, -1).every(l => l.startsWith(temas.normal.marco.lado)))
})
