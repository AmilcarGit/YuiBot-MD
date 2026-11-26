// Código Oficial de YuiBot-MD.by AmilcarGit
import test from 'node:test'
import assert from 'node:assert/strict'
import { contieneStickerSonido, parcharProto } from '../nucleo/protoSticker.js'

// Escritor de protobuf mínimo con la misma interfaz que protobufjs (uint32, string, fork, ldelim, finish).
class Escritor {
  constructor() { this.pila = [[]] }
  get actual() { return this.pila.at(-1) }
  uint32(n) { for (; n > 127; n = Math.floor(n / 128)) this.actual.push((n % 128) | 128); this.actual.push(n); return this }
  string(t) { const b = Buffer.from(t); this.uint32(b.length); this.actual.push(...b); return this }
  fork() { this.pila.push([]); return this }
  ldelim() { const dentro = this.pila.pop(); this.uint32(dentro.length); this.actual.push(...dentro); return this }
  finish() { return Buffer.from(this.pila[0]) }
}
// "proto" de mentira: solo codifica el mimetype (campo 1) de cada mensaje, como haría la versión sin soporte.
function protoFalso() {
  const A = { encode: (m, w = new Escritor()) => (m.mimetype ? w.uint32(10).string(m.mimetype) : w) }
  const S = { encode: (m, w = new Escritor()) => (m.mimetype ? w.uint32(10).string(m.mimetype) : w) }
  const M = { StickerMessage: S, AudioMessage: A, encode(m, w = new Escritor()) { if (m.stickerMessage) S.encode(m.stickerMessage, w.uint32(210).fork()).ldelim(); return w } }
  return { Message: M }
}

test('sin el parche, el sticker con audio se pierde; con el parche sale completo', () => {
  const proto = protoFalso()
  const mensaje = { audioStickerMessage: { message: { stickerMessage: { mimetype: 'image/webp', audioMessage: { mimetype: 'audio/ogg; codecs=opus' } } } } }
  assert.equal(contieneStickerSonido(proto.Message.encode(mensaje).finish()), false)
  parcharProto(proto); parcharProto(proto) // idempotente
  const bytes = proto.Message.encode(mensaje).finish()
  assert.equal(contieneStickerSonido(bytes), true)
  assert.ok(bytes.includes(Buffer.from('audio/ogg; codecs=opus')))
  assert.equal(bytes.filter((_, i) => bytes[i] === 0xb2 && bytes[i + 1] === 0x08).length, 1) // etiqueta del campo 134
})

test('un sticker normal (sin audio) no cambia', () => {
  const proto = protoFalso(); const antes = proto.Message.encode({ stickerMessage: { mimetype: 'image/webp' } }).finish()
  parcharProto(proto)
  assert.deepEqual(proto.Message.encode({ stickerMessage: { mimetype: 'image/webp' } }).finish(), antes)
})

test('parcharProto avisa si la librería no tiene codificadores', () => {
  assert.throws(() => parcharProto({}), /sin soporte/)
})
