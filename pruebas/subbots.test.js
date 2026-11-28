// Código Oficial de YuiBot-MD.by AmilcarGit
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import ajustes from '../ajustes.js'
import { _interno, cupos, detenerSubbot, infoSubbot, tiempoActivo } from '../nucleo/subbots.js'
import mibot from '../habilidades/subbots/mibot.js'
import detenerbot from '../habilidades/subbots/detenerbot.js'
import cuposCmd from '../habilidades/subbots/cupos.js'
import quitarbot from '../habilidades/dueno/quitarbot.js'

const carpeta = fs.mkdtempSync(path.join(os.tmpdir(), 'subbots-')); ajustes.sesionSubbots = carpeta; ajustes.maxSubbots = 3
const ctxBase = (args = [], extra = {}) => { const s = { resp: [], bot: [] }; return { s, numero: '51900000001', prefijo: '.', args, grupo: false, botonesActivos: true, responder: async t => s.resp.push(t), botones: async (t, l) => s.bot.push({ t, l }), ...extra } }
const falso = () => { let cerrado = false; return { logout: async () => { cerrado = true }, end: () => {}, get cerrado() { return cerrado } } }

test('tiempoActivo y cupos', () => {
  const ahora = 10 * 86400e3
  assert.equal(tiempoActivo(ahora - 5 * 60e3, ahora), '5 min'); assert.equal(tiempoActivo(ahora - 3 * 3600e3 - 120e3, ahora), '3 h 2 min'); assert.equal(tiempoActivo(ahora - 2 * 86400e3 - 4 * 3600e3, ahora), '2 d 4 h')
  assert.deepEqual(cupos(), { usados: 0, maximo: 3, libres: 3 })
})

test('.mibot: sin sub-bot ofrece crearlo; con sub-bot muestra el estado y botón para detener', async () => {
  const sin = ctxBase(); await mibot.ejecutar({}, {}, sin); assert.equal(sin.s.bot[0].l[0].cmd, 'serbot')
  _interno.activos.set('51900000001', falso()); _interno.desde.set('51900000001', Date.now() - 90 * 60e3)
  const con = ctxBase(); await mibot.ejecutar({}, {}, con)
  assert.match(con.s.bot[0].t, /Conectado/); assert.match(con.s.bot[0].t, /1 h 30 min/); assert.equal(con.s.bot[0].l[0].cmd, 'detenerbot')
  assert.deepEqual(infoSubbot('51900000001').conectado, true)
})

test('.cupos cuenta los lugares ocupados', async () => {
  const ctx = ctxBase(); await cuposCmd.ejecutar({}, {}, ctx)
  assert.match(ctx.s.bot[0].t, /1 de 3/); assert.match(ctx.s.bot[0].t, /Libres: 2/)
})

test('.detenerbot pide confirmación y luego cierra la sesión y borra la carpeta', async () => {
  const sock = _interno.activos.get('51900000001'); fs.mkdirSync(path.join(carpeta, '51900000001')); fs.writeFileSync(path.join(carpeta, '51900000001', 'creds.json'), '{}')
  const pide = ctxBase(); await detenerbot.ejecutar({}, {}, pide)
  assert.deepEqual(pide.s.bot[0].l.map(x => x.cmd), ['detenerbot si', 'mibot'])
  const si = ctxBase(['si']); await detenerbot.ejecutar({}, {}, si)
  assert.equal(sock.cerrado, true); assert.equal(fs.existsSync(path.join(carpeta, '51900000001')), false); assert.equal(infoSubbot('51900000001').existe, false)
  assert.match(si.s.resp[0], /se apagó/)
  const otra = ctxBase(); await detenerbot.ejecutar({}, {}, otra); assert.match(otra.s.resp[0], /No tienes un sub-bot/)
})

test('.quitarbot (dueño) valida el número y evita rutas peligrosas', async () => {
  await assert.rejects(detenerSubbot('../etc'), /no es válido/)
  const mala = ctxBase(['abc']); await quitarbot.ejecutar({}, {}, mala); assert.match(mala.s.resp[0], /número del sub-bot/)
  fs.mkdirSync(path.join(carpeta, '51911111111'))
  const ok = ctxBase(['+51 911 111 111']); await quitarbot.ejecutar({}, {}, ok)
  assert.match(ok.s.resp[0], /apagado/); assert.equal(fs.existsSync(path.join(carpeta, '51911111111')), false)
  const no = ctxBase(['51922222222']); await quitarbot.ejecutar({}, {}, no); assert.match(no.s.resp[0], /no tiene sub-bot/)
})
