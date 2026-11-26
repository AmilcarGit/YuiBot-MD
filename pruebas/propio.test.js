// Código Oficial de YuiBot-MD.by AmilcarGit
import test from 'node:test'
import assert from 'node:assert/strict'
import { habilidades } from '../nucleo/cargador.js'
import { procesar } from '../nucleo/cerebro.js'

const mensaje = (texto, extra = {}) => ({ key: { remoteJid: '51999@s.whatsapp.net', fromMe: true, id: 'ID' + Math.random(), ...extra }, message: { conversation: texto } })

test('el número vinculado puede usar el bot desde su teléfono, sin contestarse a sí mismo', async () => {
  const vistos = []
  habilidades.set('eco', { nombre: 'eco', categoria: 'general', ayuda: 'x', ejecutar: async (_s, _m, ctx) => { vistos.push({ dueno: ctx.esDueno, numero: ctx.numero }) } })
  const enviados = []
  const sock = { user: { id: '51888:7@s.whatsapp.net' }, sendMessage: async (j, c) => { const r = { key: { id: 'BOT1' } }; enviados.push(c); return r } }
  await procesar(sock, { type: 'notify', messages: [mensaje('hola sin prefijo')] })
  assert.equal(vistos.length, 0) // sin prefijo: se ignora
  await procesar(sock, { type: 'notify', messages: [mensaje('.eco')] })
  assert.deepEqual(vistos, [{ dueno: true, numero: '51888' }]) // comando propio: cuenta como dueño y con el número del bot
  // Lo que el bot mismo envió no se vuelve a procesar aunque empiece con prefijo.
  await sock.sendMessage('x', { text: '.eco' })
  await procesar(sock, { type: 'notify', messages: [{ key: { remoteJid: 'x', fromMe: true, id: 'BOT1' }, message: { conversation: '.eco' } }] })
  assert.equal(vistos.length, 1)
})
