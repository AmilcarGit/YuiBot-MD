// Código Oficial de YuiBot-MD.by AmilcarGit
import test from 'node:test'
import assert from 'node:assert/strict'
import { charlaLibre, REGLAS_IA, SISTEMA_IA, MAX_DIARIO, estado } from '../nucleo/charla.js'

const crear = (extra = {}) => {
  const salidas = []
  const ctx = { numero: `n${Math.random()}`, grupo: false, texto: 'hola', usuario: {}, prefijo: '.',
    responder: async c => { salidas.push(c) }, botones: async (c, l) => { salidas.push({ c, l }) }, ...extra }
  return { ctx, salidas }
}

test('sin aceptar: muestra términos con botones y no llama a la IA', async () => {
  const { ctx, salidas } = crear()
  let llamadas = 0
  assert.equal(await charlaLibre(ctx, { ia: async () => { llamadas++; return 'x' } }), true)
  assert.equal(llamadas, 0)
  assert.match(salidas[0].c, /Términos y reglas/)
  assert.deepEqual(salidas[0].l.map(b => b.cmd), ['iaacepto', 'iareglas', 'iaoff'])
  // el aviso no se repite enseguida
  await charlaLibre(ctx, { ia: async () => 'x' })
  assert.equal(salidas.length, 1)
})

test('aceptado: responde con la IA, con reglas en el sistema e historial', async () => {
  const { ctx, salidas } = crear()
  estado(ctx.usuario).acepto = 1
  let visto
  const ia = async (t, o) => { visto = o; return 'respuesta' }
  await charlaLibre(ctx, { ia, ahora: 1e12 })
  assert.equal(salidas[0], '🎀 respuesta')
  assert.equal(visto.sistema, SISTEMA_IA)
  assert.match(SISTEMA_IA, /REGLAS OBLIGATORIAS/)
  ctx.texto = 'otra'
  await charlaLibre(ctx, { ia, ahora: 1e12 + 7000 })
  assert.equal(visto.historial.length, 2)
})

test('desactivada, grupos y texto vacío: no hace nada', async () => {
  const a = crear(); estado(a.ctx.usuario).activa = false
  assert.equal(await charlaLibre(a.ctx), false)
  assert.equal(await charlaLibre(crear({ grupo: true }).ctx), false)
  assert.equal(await charlaLibre(crear({ texto: '  ' }).ctx), false)
})

test('límites: espera entre mensajes, largo y tope diario', async () => {
  const { ctx, salidas } = crear()
  estado(ctx.usuario).acepto = 1
  const ia = async () => 'ok'
  await charlaLibre(ctx, { ia, ahora: 5e12 })
  await charlaLibre(ctx, { ia, ahora: 5e12 + 1000 })
  assert.match(salidas[1], /momentito/)
  ctx.texto = 'a'.repeat(700)
  await charlaLibre(ctx, { ia, ahora: 5e12 + 20000 })
  assert.match(salidas[2], /muy largo/)
  ctx.texto = 'hola'
  estado(ctx.usuario).usos = MAX_DIARIO
  await charlaLibre(ctx, { ia, ahora: 5e12 + 40000 })
  assert.match(salidas[3], /límite/)
})

test('si la IA falla avisa y no gasta cupo', async () => {
  const { ctx, salidas } = crear()
  estado(ctx.usuario).acepto = 1
  await charlaLibre(ctx, { ia: async () => { throw new Error('x') }, ahora: 6e12 })
  assert.match(salidas[0], /no responde/)
  assert.equal(estado(ctx.usuario).usos, 0)
})

test('las reglas cubren lo esencial', () => {
  for (const t of [/ilegal/, /menores/, /contraseñas/, /por día/, /iaborrar/]) assert.match(REGLAS_IA, t)
})
