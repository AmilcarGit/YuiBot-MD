// Código Oficial de YuiBot-MD.by AmilcarGit
import test from 'node:test'
import assert from 'node:assert/strict'
import { preguntarIA } from '../nucleo/utilidades.js'
import { charlaLibre, estado } from '../nucleo/charla.js'

const original = globalThis.fetch
const resp = (cuerpo, status = 200) => ({ ok: status < 400, status, text: async () => cuerpo, json: async () => JSON.parse(cuerpo) })

test('si el POST falla usa el GET con la ruta limpia (sin / % # ni saltos)', async t => {
  const urls = []
  globalThis.fetch = async (url, opciones) => {
    urls.push({ url: String(url), post: opciones?.method === 'POST' })
    if (opciones?.method === 'POST') return resp('x', 404)
    return resp('hola desde GET')
  }
  t.after(() => { globalThis.fetch = original })
  const r = await preguntarIA('50% de 20/4 #ya?', { historial: [{ de: 'usuario', texto: 'a/b' }, { de: 'yui', texto: 'c\nd' }] })
  assert.equal(r, 'hola desde GET')
  const get = urls.find(u => !u.post).url
  assert.doesNotMatch(get, /%2F|%25|%23|%0A|%0D/)
})

test('el POST usa mensajes con sistema, historial y la pregunta', async t => {
  let cuerpo
  globalThis.fetch = async (url, o) => { cuerpo = JSON.parse(o.body); return resp(JSON.stringify({ choices: [{ message: { content: 'ok POST' } }] })) }
  t.after(() => { globalThis.fetch = original })
  assert.equal(await preguntarIA('hola', { sistema: 'SIS', historial: [{ de: 'usuario', texto: 'u1' }, { de: 'yui', texto: 'y1' }] }), 'ok POST')
  assert.deepEqual(cuerpo.messages.map(m => m.role), ['system', 'user', 'assistant', 'user'])
})

test('mientras Yui piensa, otro mensaje del mismo usuario no genera otra respuesta', async () => {
  const salidas = []
  const ctx = { numero: 'enCurso1', grupo: false, texto: 'hola', usuario: {}, prefijo: '.', responder: async c => { salidas.push(c) } }
  estado(ctx.usuario).acepto = 1
  let libera
  const lenta = () => new Promise(r => { libera = () => r('listo') })
  const p1 = charlaLibre(ctx, { ia: lenta, ahora: 7e12 })
  await new Promise(r => setTimeout(r, 5))
  await charlaLibre(ctx, { ia: async () => 'otra', ahora: 7e12 + 9000 })
  libera(); await p1
  assert.deepEqual(salidas, ['🎀 listo'])
})
