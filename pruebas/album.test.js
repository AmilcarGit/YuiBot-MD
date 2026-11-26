// Código Oficial de YuiBot-MD.by AmilcarGit
import test from 'node:test'
import assert from 'node:assert/strict'
import { albumNativo, enviarImagenes } from '../nucleo/album.js'

// Librería de mentira: "proto" que sí (o no) conserva los campos del álbum.
const libreria = (conSoporte) => ({
  generateWAMessageFromContent: (jid, c) => ({ key: { id: 'ALBUM', remoteJid: jid, fromMe: true }, message: c }),
  generateWAMessage: async (jid, c) => ({ key: { id: 'IMG' + Math.random() }, message: { imageMessage: c } }),
  proto: { Message: { fromObject: o => o, encode: o => ({ finish: () => o }), decode: o => (conSoporte ? o : {}) } }
})
const fetchOk = async () => ({ ok: true, arrayBuffer: async () => new Uint8Array([1, 2, 3]).buffer })
const conFetch = async (f, fn) => { const o = globalThis.fetch; globalThis.fetch = f; try { return await fn() } finally { globalThis.fetch = o } }
const items = [{ url: 'https://i.pinimg.com/a.jpg', caption: 'uno' }, { url: 'https://i.pinimg.com/b.jpg', caption: '' }, { url: 'https://i.pinimg.com/c.jpg', caption: '' }]

test('álbum nativo: manda el álbum y cada imagen asociada a él', async () => {
  const enviados = []; const sock = { user: { id: '1@s' }, waUploadToServer: () => {}, relayMessage: async (j, m, o) => enviados.push({ m, o }) }
  const n = await conFetch(fetchOk, () => albumNativo(sock, 'g@g.us', items, {}, libreria(true)))
  assert.equal(n, 3); assert.equal(enviados.length, 4)
  assert.equal(enviados[0].m.albumMessage.expectedImageCount, 3)
  for (const e of enviados.slice(1)) { assert.equal(e.m.messageContextInfo.messageAssociation.associationType, 1); assert.equal(e.m.messageContextInfo.messageAssociation.parentMessageKey.id, 'ALBUM') }
})

test('álbum nativo: sin soporte del protocolo no envía nada y avisa', async () => {
  const enviados = []; const sock = { relayMessage: async () => enviados.push(1) }
  await assert.rejects(albumNativo(sock, 'g@g.us', items, {}, libreria(false)), /no conoce los álbumes/)
  assert.equal(enviados.length, 0)
})

test('álbum nativo: si casi no se pueden bajar imágenes, no arma un álbum a medias', async () => {
  const sock = { relayMessage: async () => assert.fail('no debía enviar') }
  await assert.rejects(conFetch(async () => ({ ok: false }), () => albumNativo(sock, 'g@g.us', items, {}, libreria(true))), /suficientes imágenes/)
})

test('enviarImagenes: la web recibe una galería y, sin soporte, WhatsApp recibe imágenes sueltas', async () => {
  const web = []; await enviarImagenes({ web: true, enviar: async c => web.push(c) }, {}, items)
  assert.equal(web.length, 1); assert.equal(web[0].album.length, 3)
  const sueltas = []
  await enviarImagenes({ sock: {}, jid: 'g@g.us', enviar: async c => sueltas.push(c) }, {}, items) // la Yui-Bails de prueba no trae álbumes
  assert.equal(sueltas.length, 3); assert.equal(sueltas[0].caption, 'uno')
})
