// Interpretación de mensajes y comandos.
const test = require('node:test')
const assert = require('node:assert/strict')
const { getMessageBody, parseCommand } = require('../lib/handler')

const config = { PREFIXES: ['!', '.', '/', '#'], ALLOW_NO_PREFIX: true, IA_ENABLED: false }

test('getMessageBody lee texto simple, extendido, captions y respuestas de botones', () => {
  assert.equal(getMessageBody({ message: { conversation: 'hola' } }), 'hola')
  assert.equal(getMessageBody({ message: { extendedTextMessage: { text: 'ext' } } }), 'ext')
  assert.equal(getMessageBody({ message: { imageMessage: { caption: 'foto' } } }), 'foto')
  assert.equal(getMessageBody({ message: { buttonsResponseMessage: { selectedButtonId: '.menu' } } }), '.menu')
  assert.equal(
    getMessageBody({ message: { listResponseMessage: { singleSelectReply: { selectedRowId: '.ping' } } } }),
    '.ping'
  )
  assert.equal(
    getMessageBody({ message: { interactiveResponseMessage: { nativeFlowResponseMessage: { paramsJson: '{"id":".info"}' } } } }),
    '.info'
  )
  assert.equal(getMessageBody({ message: {} }), '')
})

test('un paramsJson inválido no revienta', () => {
  const msg = { message: { interactiveResponseMessage: { nativeFlowResponseMessage: { paramsJson: '{roto' } } } }
  assert.equal(getMessageBody(msg), '')
})

test('parseCommand separa prefijo, comando y argumentos', () => {
  assert.deepEqual(parseCommand('.Ping uno dos', config), { commandName: 'ping', args: ['uno', 'dos'], usedPrefix: '.' })
  assert.deepEqual(parseCommand('#menu', config), { commandName: 'menu', args: [], usedPrefix: '#' })
})

test('parseCommand ignora vacío y prefijo solo', () => {
  assert.equal(parseCommand('', config), null)
  assert.equal(parseCommand('   ', config), null)
  assert.equal(parseCommand('.', config), null)
  assert.equal(parseCommand(undefined, config), null)
})

test('sin prefijo: solo es comando si existe; si no, se ignora (IA desactivada)', () => {
  global.__YUI_COMMANDS = new Map([['ping', {}]])
  assert.equal(parseCommand('ping', config)?.commandName, 'ping')
  assert.equal(parseCommand('hola como estas', config), null)
})

test('sin prefijo con IA activada: lo que no es comando va al comando "ia"', () => {
  global.__YUI_COMMANDS = new Map([['ping', {}]])
  const r = parseCommand('hola como estas', { ...config, IA_ENABLED: true })
  assert.equal(r.commandName, 'ia')
  assert.deepEqual(r.args, ['hola como estas'])
})

test('con ALLOW_NO_PREFIX en false, un texto sin prefijo no es comando', () => {
  global.__YUI_COMMANDS = new Map([['ping', {}]])
  assert.equal(parseCommand('ping', { ...config, ALLOW_NO_PREFIX: false }), null)
})
