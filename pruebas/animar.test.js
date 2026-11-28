// Código Oficial de YuiBot-MD.by AmilcarGit
import test from 'node:test'
import assert from 'node:assert/strict'
import { animar, cuadrosCarga, ritmo } from '../nucleo/animar.js'
import mibot from '../habilidades/subbots/mibot.js'
import serbot from '../habilidades/subbots/serbot.js'

ritmo.ms = 0
const ctxCon = (extra = {}) => { const s = { resp: [], env: [], bot: [] }; return { s, numero: '51955555555', prefijo: '.', botonesActivos: true, responder: async t => { s.resp.push(t); return { key: { id: 'K1' } } }, enviar: async c => s.env.push(c), botones: async (t, l) => s.bot.push({ t, l }), ...extra } }

test('cuadrosCarga sube la barra hasta el 100 %', () => {
  const c = cuadrosCarga('Cargando', { pasos: 4, final: '✅ Listo' })
  assert.equal(c.length, 5); assert.match(c[0], /25%/); assert.match(c[3], /▰{8} 100%/); assert.equal(c[4], '✅ Listo')
})

test('animar manda el primer cuadro y edita el mismo mensaje con los demás', async () => {
  const ctx = ctxCon(); const clave = await animar(ctx, ['a', 'b', 'c'])
  assert.deepEqual(clave, { id: 'K1' }); assert.deepEqual(ctx.s.resp, ['a'])
  assert.deepEqual(ctx.s.env, [{ text: 'b', edit: { id: 'K1' } }, { text: 'c', edit: { id: 'K1' } }])
})

test('animar no hace nada en la web, sin clave o si editar falla', async () => {
  const web = ctxCon({ web: true }); assert.equal(await animar(web, ['a', 'b']), null); assert.deepEqual(web.s.resp, [])
  const sinClave = ctxCon({ responder: async () => ({}) }); assert.equal(await animar(sinClave, ['a', 'b']), null)
  const falla = ctxCon({ enviar: async () => { throw new Error('no se puede editar') } }); assert.deepEqual(await animar(falla, ['a', 'b', 'c']), { id: 'K1' })
})

test('.mibot anima la búsqueda y luego manda el estado con botones', async () => {
  const ctx = ctxCon(); await mibot.ejecutar({}, {}, ctx)
  assert.match(ctx.s.resp[0], /Buscando tu sub-bot/); assert.ok(ctx.s.env.some(e => /Señal encontrada/.test(e.text)))
  assert.equal(ctx.s.bot[0].l[0].cmd, 'serbot')
})

test('.serbot (sin cupo) avisa del error aunque haya animación', async () => {
  const ctx = ctxCon(); const { default: ajustes } = await import('../ajustes.js'); const antes = ajustes.maxSubbots; ajustes.maxSubbots = 0
  await serbot.ejecutar({}, {}, ctx); ajustes.maxSubbots = antes
  assert.match(ctx.s.resp.at(-1), /cupos/)
})
