// Código Oficial de YuiBot-MD.by AmilcarGit
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import ajustes from '../ajustes.js'
import { _interno, configSubbot, esSubbot, nombreDe, prefijosDe } from '../nucleo/subbots.js'
import prefijo, { PREFIJO_VALIDO } from '../habilidades/subbots/prefijo.js'
import nombrebot from '../habilidades/subbots/nombrebot.js'

ajustes.sesionSubbots = fs.mkdtempSync(path.join(os.tmpdir(), 'subcfg-'))
const sub = { user: { id: '51977777777:12@s.whatsapp.net' } }; const principal = { user: { id: '51900000000:1@s.whatsapp.net' } }
_interno.activos.set('51977777777', sub)
const ctx = (args = []) => { const s = { resp: [], bot: [] }; return { s, prefijo: '.', args, responder: async t => s.resp.push(t), botones: async (t, l) => s.bot.push({ t, l }), botonesActivos: true } }

test('símbolos válidos como prefijo', () => {
  for (const ok of ['!', '#', '/', '$$', '🌸', '.!']) assert.ok(PREFIJO_VALIDO.test(ok), ok)
  for (const mal of ['a', '1', '!a', ' ', '', '!!!!', 'ab']) assert.ok(!PREFIJO_VALIDO.test(mal), mal)
})

test('.prefijo y .nombrebot: solo en sub-bots, se guardan en disco y se restauran', async () => {
  const fuera = ctx(['!']); await prefijo.ejecutar(principal, {}, fuera); assert.match(fuera.s.resp[0], /solo para sub-bots/)
  assert.deepEqual(prefijosDe(sub), ajustes.prefijos); assert.equal(nombreDe(sub), ajustes.nombre)
  assert.ok(esSubbot(sub)); assert.ok(!esSubbot(principal))

  const c = ctx(['!']); await prefijo.ejecutar(sub, {}, c)
  assert.deepEqual(prefijosDe(sub), ['!']); assert.deepEqual(prefijosDe(principal), ajustes.prefijos); assert.match(c.s.resp[0], /!menu/)
  const mala = ctx(['abc']); await prefijo.ejecutar(sub, {}, mala); assert.match(mala.s.resp[0], /1 a 3 símbolos/); assert.deepEqual(prefijosDe(sub), ['!'])
  const ver = ctx(); await prefijo.ejecutar(sub, {}, ver); assert.deepEqual(ver.s.bot[0].l.map(x => x.cmd), ['prefijo !', 'prefijo #', 'prefijo reset'])

  const n = ctx(['Mi', 'Bot']); await nombrebot.ejecutar(sub, {}, n); assert.equal(nombreDe(sub), 'Mi Bot')
  const larga = ctx(['x'.repeat(21)]); await nombrebot.ejecutar(sub, {}, larga); assert.match(larga.s.resp[0], /Máximo 20/)

  // Persistencia: tras olvidar la caché, se lee del archivo.
  _interno.configs.clear(); assert.deepEqual(configSubbot('51977777777'), { prefijo: '!', nombre: 'Mi Bot' })

  await prefijo.ejecutar(sub, {}, ctx(['reset'])); await nombrebot.ejecutar(sub, {}, ctx(['reset']))
  assert.deepEqual(prefijosDe(sub), ajustes.prefijos); assert.equal(nombreDe(sub), ajustes.nombre)
})
