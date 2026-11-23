import test from 'node:test'
import assert from 'node:assert/strict'
import { aBotonesWa, conBotones, textoAlterno } from '../nucleo/botones.js'
import { extraerTexto } from '../nucleo/utiles.js'

const lista = [
  { texto: '🪨 Piedra', cmd: 'ppt piedra' },
  { texto: '📄 Papel', cmd: 'ppt papel' },
  { texto: '✂️ Tijera', cmd: 'ppt tijera' },
  { texto: '❌ De más', cmd: 'x' }
]

test('los botones rápidos llevan el comando con prefijo como id y no pasan de 3', () => {
  const wa = aBotonesWa(lista, '.')
  assert.equal(wa.length, 3)
  assert.deepEqual(wa[0], { text: '🪨 Piedra', id: '.ppt piedra' })
})

test('el desplegable respeta los límites de WhatsApp', () => {
  const [d] = aBotonesWa([{
    texto: '📜 Un texto de botón muy largo para WhatsApp',
    secciones: [{ titulo: 'Una sección con título larguísimo de verdad', filas: Array.from({ length: 14 }, (_, i) => ({ titulo: `.comando-numero-${i}-largo-largo`, descripcion: 'x'.repeat(100), cmd: `c${i}` })) }]
  }], '#')
  assert.ok(d.text.length <= 20)
  assert.ok(d.sections[0].title.length <= 24)
  assert.equal(d.sections[0].rows.length, 10)
  assert.ok(d.sections[0].rows[0].title.length <= 24 && d.sections[0].rows[0].description.length <= 72)
  assert.equal(d.sections[0].rows[3].id, '#c3')
})

test('sin botones queda el texto con los atajos escritos', () => {
  assert.equal(textoAlterno(lista.slice(0, 2), '.'), '\n\n💡 .ppt piedra · .ppt papel')
  assert.equal(textoAlterno([{ texto: 'a', secciones: [] }], '.'), '')
})

test('conBotones usa ctx.botones si existe y si no responde solo con el texto', async () => {
  const salidas = []
  await conBotones({ responder: async t => salidas.push(['texto', t]) }, 'hola', lista)
  await conBotones({ botones: async (t, l) => salidas.push(['botones', t, l.length]) }, 'hola', lista)
  assert.deepEqual(salidas, [['texto', 'hola'], ['botones', 'hola', 4]])
})

test('al tocar un botón, la respuesta se lee como el comando que lleva', () => {
  const rapido = { message: { buttonsResponseMessage: { selectedButtonId: '.ppt papel' } } }
  const fila = { message: { listResponseMessage: { singleSelectReply: { selectedRowId: '.tienda comprar pico' } } } }
  const nativo = { message: { interactiveResponseMessage: { nativeFlowResponseMessage: { paramsJson: JSON.stringify({ id: '.daily' }) } } } }
  const efimero = { message: { ephemeralMessage: { message: { buttonsResponseMessage: { selectedButtonId: '.gacha' } } } } }
  assert.equal(extraerTexto(rapido), '.ppt papel')
  assert.equal(extraerTexto(fila), '.tienda comprar pico')
  assert.equal(extraerTexto(nativo), '.daily')
  assert.equal(extraerTexto(efimero), '.gacha')
})
