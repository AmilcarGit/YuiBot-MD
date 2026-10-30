// Sincronización con la base compartida: deltas, mezcla, reintentos y comandos (con un servidor falso).
const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('fs')
const os = require('os')
const path = require('path')
const { respaldar } = require('./_util')

const restaurar = respaldar([path.join(__dirname, '..', 'data', 'usuarios.json'), path.join(__dirname, '..', 'data', 'trabajos.json')])
test.after(() => restaurar())

const config = require('../defaults')
const db = require('../lib/db')
const T = require('../lib/trabajos')
const S = require('../lib/sincronizacion')

const ajustes = S.leerAjustes({ SYNC: { URL: 'https://prueba.vercel.app/', INTERVALO_MS: 60000, LOTE: 100 } }, {})
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sync-'))
const rutas = () => ({ base: path.join(dir, 'base.json'), pendiente: path.join(dir, 'pend.json'), clave: path.join(dir, 'clave.json') })
const limpiarRutas = (r) => { for (const f of Object.values(r)) fs.rmSync(f, { force: true }) }
let contador = 0
const nuevoNumero = () => `5192${String(++contador).padStart(7, '0')}`

/** Servidor falso con la misma idea del real: suma deltas, recuerda rid, valida clave. */
function servidorFalso({ fallar = null } = {}) {
  const usuarios = new Map(); const trabajos = new Map(); const rids = new Map(); const instalaciones = new Map()
  const llamadas = []; let n = 0
  const respuesta = (status, datos) => ({ ok: status < 300, status, json: async () => datos })
  const fetchFn = async (url, op) => {
    const ruta = url.replace('https://prueba.vercel.app', '')
    llamadas.push(`${op.method} ${ruta}`)
    if (fallar && fallar(ruta, llamadas.length)) return fallar(ruta, llamadas.length)
    const cab = op.headers
    if (ruta === '/api/registrar') { const id = `inst${++n}`; instalaciones.set(id, `clave${n}`); return respuesta(200, { ok: true, id, clave: `clave${n}` }) }
    if (ruta.startsWith('/api/top')) return respuesta(200, { ok: true, top: [{ pos: 1, visible: '519•••479', valor: 1234 }] })
    if (ruta === '/api/sync') {
      if (instalaciones.get(cab['x-instalacion']) !== cab['x-clave']) return respuesta(401, { ok: false, error: 'Instalación no registrada.' })
      const cuerpo = JSON.parse(op.body)
      if (rids.has(cuerpo.rid)) return respuesta(200, rids.get(cuerpo.rid))
      const salida = {}
      for (const [num, it] of Object.entries(cuerpo.usuarios)) {
        salida[num] = {}
        if (it.u) {
          const s = usuarios.get(num) || { monedas: 0, xp: 0, mensajes: 0, reputacion: 0, trabajosVeces: 0, trabajosGanado: 0 }
          const m = { ...it.u.r, ...s }
          for (const f of S.ADITIVOS) m[f] = Math.max(0, (s[f] || 0) + (it.u.d[f] || 0))
          if (it.u.r.semana) { m.semana = it.u.r.semana; m.xpSemana = (s.semana === it.u.r.semana ? s.xpSemana || 0 : 0) + (it.u.d.xpSemana || 0) }
          m.nivel = Math.floor(Math.sqrt(m.xp / 100)); m.actualizado = Math.max(s.actualizado || 0, it.u.r.actualizado || 0)
          usuarios.set(num, m); salida[num].u = m
        }
        if (it.t) {
          const s = trabajos.get(num) || { cd: {}, veces: {}, ganado: 0, granja: [], mejoras: {} }
          const m = { ...s, cd: { ...s.cd, ...it.t.r.cd }, mejoras: { ...s.mejoras, ...it.t.r.mejoras }, granja: it.t.r.granja || s.granja }
          m.ganado = s.ganado + (it.t.d.ganado || 0)
          m.veces = { ...s.veces }; for (const [k, v] of Object.entries(it.t.d.veces || {})) m.veces[k] = (m.veces[k] || 0) + v
          m.actualizado = Math.max(s.actualizado || 0, it.t.r.actualizado || 0)
          trabajos.set(num, m); salida[num].t = m
        }
      }
      const r = { ok: true, ts: Date.now(), usuarios: salida, errores: {} }
      rids.set(cuerpo.rid, r)
      return respuesta(200, r)
    }
    return respuesta(404, { error: 'no' })
  }
  return { fetchFn, usuarios, trabajos, llamadas, rids }
}

test('ajustes: se activa con URL válida y respeta apagado por config o entorno', () => {
  assert.equal(ajustes.activo, true); assert.equal(ajustes.url, 'https://prueba.vercel.app')
  assert.equal(S.leerAjustes({ SYNC: { URL: '' } }, {}).activo, false)
  assert.equal(S.leerAjustes({ SYNC: { URL: 'esto no es url' } }, {}).activo, false)
  assert.equal(S.leerAjustes({ SYNC: { URL: 'https://a.com', ENABLED: false } }, {}).activo, false)
  assert.equal(S.leerAjustes({ SYNC: { URL: '' } }, { SYNC_URL: 'https://b.com' }).url, 'https://b.com')
  assert.equal(S.leerAjustes({ SYNC: { URL: 'https://a.com' } }, { SYNC_ENABLED: 'false' }).activo, false)
  assert.equal(S.leerAjustes({ SYNC: { URL: 'https://a.com', INTERVALO_MS: 5 } }, {}).intervaloMs, 30000, 'mínimo 30 s')
  assert.equal(S.mascara('51910227479'), '519•••479')
})

test('deltas: lo que cambió desde la base, semana nueva y trabajos', () => {
  assert.deepEqual(S.deltasUsuario({ monedas: 150, xp: 20, semana: '2026-10-26', xpSemana: 20 }, { monedas: 100, xp: 20, semana: '2026-10-26', xpSemana: 5 }), { monedas: 50, xpSemana: 15 })
  assert.deepEqual(S.deltasUsuario({ monedas: 10, semana: '2026-11-02', xpSemana: 7 }, { monedas: 10, semana: '2026-10-26', xpSemana: 99 }), { xpSemana: 7 }, 'semana nueva: todo cuenta')
  assert.deepEqual(S.deltasUsuario({ monedas: 30 }, undefined), { monedas: 30 })
  assert.deepEqual(S.deltasUsuario({ monedas: 30 }, { monedas: 30 }), {})
  assert.deepEqual(S.deltasTrabajos({ ganado: 90, veces: { minar: 5, pescar: 1 } }, { ganado: 40, veces: { minar: 3, pescar: 1 } }), { ganado: 50, veces: { minar: 2 } })
})

test('lotes: primero los que cambiaron, luego los recientes; ignora los viejos y los números raros', () => {
  const ahora = 1e12
  const base = { usuarios: { 51900000002: { monedas: 5, xp: 0, mensajes: 0, reputacion: 0, trabajosVeces: 0, trabajosGanado: 0, semana: '', xpSemana: 0, actualizado: 1 } }, trabajos: {} }
  const lotes = S.prepararLotes({
    usuarios: {
      51900000001: { monedas: 10, actualizado: ahora - 1000 }, // nuevo → semilla
      51900000002: { monedas: 5, actualizado: ahora - 1000 }, // sin cambios pero reciente
      51900000003: { monedas: 5, actualizado: ahora - 3 * 86400000 }, // viejo y nuevo (sin base) → entra por ser nuevo
      raro: { monedas: 1 },
    },
    trabajosTodos: {}, base, ahora, lote: 2,
  })
  assert.equal(lotes.length, 2)
  assert.deepEqual(lotes.flat().map((x) => x.n), ['51900000001', '51900000003', '51900000002'])
  assert.equal(lotes[0][0].semilla, true); assert.equal(lotes[1][0].semilla, false)
  const sinNada = S.prepararLotes({ usuarios: { 51900000002: { monedas: 5, actualizado: 1 } }, trabajosTodos: {}, base, ahora, lote: 10 })
  assert.equal(sinNada.length, 0, 'sin cambios y sin actividad reciente no se envía')
})

test('aplicar: lo que cambió mientras viajaba la petición no se pierde y los demás datos se unen', () => {
  const env = { monedas: 100, xp: 50, mensajes: 0, reputacion: 0, trabajosVeces: 0, trabajosGanado: 0, semana: '2026-10-26', xpSemana: 10, actualizado: 10 }
  const actual = { monedas: 130, xp: 50, semana: '2026-10-26', xpSemana: 10, actualizado: 20, inventario: ['b'], logros: { a: 1 }, nombre: 'Local' }
  const oficial = { monedas: 400, xp: 90, semana: '2026-10-26', xpSemana: 35, inventario: ['a'], logros: { z: 1 }, nombre: 'Server', actualizado: 15, mejorRacha: 4 }
  const r = S.aplicarUsuario(actual, oficial, env)
  assert.equal(r.monedas, 430, 'oficial + lo ganado durante el envío (30)')
  assert.equal(r.xp, 90); assert.equal(r.xpSemana, 35); assert.equal(r.nivel, 0)
  assert.deepEqual(r.inventario.sort(), ['a', 'b']); assert.deepEqual(r.logros, { a: 1, z: 1 })
  assert.equal(r.nombre, 'Local', 'cambió localmente durante el envío: se conserva')
  assert.equal(r.mejorRacha, 4); assert.equal(r.actualizado, 20)
  assert.equal(S.aplicarUsuario({ monedas: 0, actualizado: 1 }, { monedas: 0 }, { monedas: 500, actualizado: 1 }).monedas, 0, 'nunca negativo')
  assert.equal(S.aplicarUsuario(null, { monedas: 7, xp: 400 }, { monedas: 0 }).nivel, 2)
  const t = S.aplicarTrabajos({ cd: { minar: 9 }, veces: { minar: 6 }, ganado: 70, mejoras: { pico: 1 }, granja: [{ x: 1 }], actualizado: 5 }, { cd: { minar: 3, pescar: 4 }, veces: { minar: 10 }, ganado: 500, mejoras: { pico: 2 }, granja: [], actualizado: 4 }, { veces: { minar: 5 }, ganado: 50, actualizado: 5 })
  assert.deepEqual(t.cd, { minar: 9, pescar: 4 }); assert.deepEqual(t.mejoras, { pico: 2 })
  assert.equal(t.veces.minar, 11); assert.equal(t.ganado, 520); assert.deepEqual(t.granja, [], 'sin cambios locales gana el servidor')
})

test('ciclo completo: se registra, manda cambios, recibe el total y deja de repetir lo ya enviado', async () => {
  const srv = servidorFalso(); const r = rutas(); limpiarRutas(r)
  const n = nuevoNumero()
  db.guardarUsuario(n, { monedas: 200, xp: 150, nombre: 'Ana' })
  T.registrar(n, 'minar', 80)
  srv.usuarios.set(n, { monedas: 1000, xp: 1000, mensajes: 0, reputacion: 0, trabajosVeces: 0, trabajosGanado: 0, actualizado: 1, inventario: ['otra-instalacion'] }) // otra instalación ya había sumado
  const res = await S.sincronizarAhora({ ajustes, fetchFn: srv.fetchFn, rutas: r })
  assert.ok(res.enviados >= 1)
  assert.ok(srv.llamadas.includes('POST /api/registrar'))
  const u = db.obtenerUsuario(n)
  assert.equal(u.monedas, 1200, 'lo de la otra instalación + lo local'); assert.equal(u.xp, 1150); assert.equal(u.nivel, Math.floor(Math.sqrt(1150 / 100)))
  assert.deepEqual(u.inventario, ['otra-instalacion']); assert.equal(u.nombre, 'Ana')
  assert.equal(JSON.parse(fs.readFileSync(r.base, 'utf8')).usuarios[n].monedas, 1200)
  assert.ok(!fs.existsSync(r.pendiente), 'ya no hay envío pendiente')
  assert.equal(JSON.parse(fs.readFileSync(r.clave, 'utf8')).id, 'inst1')

  // ganó 25 más y vuelve a sincronizar: solo sube la diferencia
  db.guardarUsuario(n, { monedas: u.monedas + 25 })
  await S.sincronizarAhora({ ajustes, fetchFn: srv.fetchFn, rutas: r })
  assert.equal(srv.usuarios.get(n).monedas, 1225)
  await S.sincronizarAhora({ ajustes, fetchFn: srv.fetchFn, rutas: r })
  assert.equal(srv.usuarios.get(n).monedas, 1225, 'sin cambios no suma otra vez')
  assert.equal(srv.llamadas.filter((l) => l === 'POST /api/registrar').length, 1, 'la instalación se registra una sola vez')
  assert.equal(srv.trabajos.get(n).ganado, 80)
})

test('si la respuesta se pierde, el reintento repite la misma petición y no cuenta doble', async () => {
  const r = rutas(); limpiarRutas(r)
  const srv0 = servidorFalso()
  let perder = true
  const fetchFn = async (url, op) => {
    const res = await srv0.fetchFn(url, op)
    if (perder && url.endsWith('/api/sync')) { perder = false; throw new Error('se cortó la conexión') } // el servidor SÍ lo procesó
    return res
  }
  const n = nuevoNumero()
  db.guardarUsuario(n, { monedas: 60 })
  await assert.rejects(() => S.sincronizarAhora({ ajustes, fetchFn, rutas: r }), /se cortó/)
  assert.ok(fs.existsSync(r.pendiente), 'queda guardado lo que se iba a enviar')
  assert.equal(srv0.usuarios.get(n).monedas, 60)
  await S.sincronizarAhora({ ajustes, fetchFn, rutas: r })
  assert.equal(srv0.usuarios.get(n).monedas, 60, 'no se suma otra vez')
  assert.equal(db.obtenerUsuario(n).monedas, 60)
  assert.ok(!fs.existsSync(r.pendiente))
})

test('si el servidor ya no reconoce la clave (401), se registra de nuevo y sigue', async () => {
  const srv = servidorFalso(); const r = rutas(); limpiarRutas(r)
  fs.writeFileSync(r.clave, JSON.stringify({ id: 'vieja', clave: 'mala' }))
  const n = nuevoNumero(); db.guardarUsuario(n, { monedas: 5 })
  await S.sincronizarAhora({ ajustes, fetchFn: srv.fetchFn, rutas: r })
  assert.equal(JSON.parse(fs.readFileSync(r.clave, 'utf8')).id, 'inst1')
  assert.equal(srv.usuarios.get(n).monedas, 5)
})

test('un fallo del servidor no toca los datos locales y queda registrado', async () => {
  const r = rutas(); limpiarRutas(r)
  const n = nuevoNumero(); db.guardarUsuario(n, { monedas: 321 })
  const caido = async () => { throw new Error('sin internet') }
  await assert.rejects(() => S.sincronizarAhora({ ajustes, fetchFn: caido, rutas: r }), /sin internet/)
  assert.equal(db.obtenerUsuario(n).monedas, 321)
  assert.equal(S.estado.ultimoError, 'sin internet'); assert.equal(S.estado.enCurso, false)
  await assert.rejects(() => S.sincronizarAhora({ ajustes: S.leerAjustes({}, {}), rutas: r }), /apagada/)
})

test('el programador espacia los reintentos, avisa una vez y se detiene si lo bloquean', async () => {
  const r = rutas(); limpiarRutas(r)
  const avisos = []; const logs = []
  let ciclo; const orig = global.setInterval; global.setInterval = (f) => { ciclo = f; return { unref() {} } }
  let estadoServidor = 'caido'
  const srv = servidorFalso()
  const fetchFn = async (u, o) => {
    if (estadoServidor === 'caido') throw new Error('sin internet')
    if (estadoServidor === 'ban') return { ok: false, status: 403, json: async () => ({ error: 'Esta instalación fue bloqueada.' }) }
    return srv.fetchFn(u, o)
  }
  try {
    const parar = S.iniciar({ ajustes, log: (t) => logs.push(t), avisar: async (t) => avisos.push(t), fetchFn, rutas: r, primerRetrasoMs: 1e9 })
    S.estado.fallosSeguidos = 0; S.estado.saltarCiclos = 0; S.estado.bloqueada = false
    await ciclo(); assert.equal(S.estado.fallosSeguidos, 1); assert.equal(S.estado.saltarCiclos, 1)
    await ciclo(); assert.equal(S.estado.fallosSeguidos, 1, 'este ciclo se salta (espera)'); assert.equal(S.estado.saltarCiclos, 0)
    await ciclo(); assert.equal(S.estado.fallosSeguidos, 2); assert.equal(S.estado.saltarCiclos, 3, 'cada fallo espera más')
    assert.equal(avisos.length, 0, 'todavía no avisa')
    S.estado.saltarCiclos = 0; await ciclo()
    S.estado.saltarCiclos = 0; await ciclo()
    assert.equal(avisos.length, 1, 'un solo aviso tras 3 fallos seguidos'); assert.ok(avisos[0].includes('datos locales'))
    estadoServidor = 'ok'; S.estado.saltarCiclos = 0
    await ciclo(); assert.equal(avisos.length, 2); assert.ok(avisos[1].includes('volvió'))
    estadoServidor = 'ban'; S.estado.saltarCiclos = 0
    const n = nuevoNumero(); db.guardarUsuario(n, { monedas: 3 })
    await ciclo(); assert.equal(S.estado.bloqueada, true)
    const antes = logs.length; await ciclo(); assert.equal(logs.length, antes, 'bloqueada: deja de intentar')
    parar()
  } finally { global.setInterval = orig; S.estado.bloqueada = false; S.estado.fallosSeguidos = 0; S.estado.saltarCiclos = 0 }
})

test('.sincronizar y .topglobal', async () => {
  const sincronizar = require('../modulos/owner/sincronizar'); const topglobal = require('../modulos/usuario/topglobal')
  assert.equal(sincronizar.ownerOnly, true)
  const enviados = []; const sock = { sendMessage: async (j, c) => { enviados.push(c.text) } }
  const msg = { key: { remoteJid: 'a@s.whatsapp.net' } }
  const apagada = { ...config, SYNC: { URL: '' } }
  await sincronizar.execute(sock, msg, [], { config: apagada }); assert.ok(enviados[0].includes('sin URL'))
  await sincronizar.execute(sock, msg, ['estado'], { config: { ...config, SYNC: { URL: 'https://prueba.vercel.app' } } }); assert.ok(enviados[1].includes('prueba.vercel.app'))
  await sincronizar.execute(sock, msg, [], { config, esSubBot: true }); assert.ok(enviados[2].includes('bot principal'))
  await topglobal.execute(sock, msg, [], { config: apagada }); assert.ok(enviados[3].includes('no está activada'))
  await topglobal.execute(sock, msg, ['zzz'], { config: { ...config, SYNC: { URL: 'https://prueba.vercel.app' } } }); assert.ok(enviados[4].includes('Elige un ranking'))
  const srv = servidorFalso()
  const original = globalThis.fetch
  globalThis.fetch = (url, op) => srv.fetchFn(url, op)
  try {
    await topglobal.execute(sock, msg, ['xp'], { config: { ...config, SYNC: { URL: 'https://prueba.vercel.app' } } })
    assert.ok(enviados[5].includes('519•••479') && enviados[5].includes('1,234'.replace(',', ',')) || enviados[5].includes('1.234') || enviados[5].includes('1234'), enviados[5])
    assert.ok(srv.llamadas.some((l) => l.includes('/api/top?campo=xp')))
    globalThis.fetch = async () => { throw new Error('caído') }
    await topglobal.execute(sock, msg, [], { config: { ...config, SYNC: { URL: 'https://prueba.vercel.app' } } })
    assert.ok(enviados[6].includes('No pude consultar'))
  } finally { globalThis.fetch = original }
})

// Prueba de contrato: el cliente contra el servidor REAL (solo si el repo YuiBot-datos está al lado).
const dirServidor = process.env.YUIBOT_DATOS_DIR || path.join(__dirname, '..', '..', 'yuibot-datos')
const hayServidor = fs.existsSync(path.join(dirServidor, 'lib', 'servicio.js'))
test('contrato con el servidor real de YuiBot-datos', { skip: !hayServidor && 'repo YuiBot-datos no encontrado' }, async () => {
  const A = require(path.join(dirServidor, 'lib', 'almacen')); const SV = require(path.join(dirServidor, 'lib', 'servicio')); const SG = require(path.join(dirServidor, 'lib', 'seguridad'))
  const almacen = A.crearMemoria(); const cfg = SG.config({ DATOS_PEPPER: 'pimienta' })
  const fetchFn = async (url, op) => {
    const ruta = url.replace('https://prueba.vercel.app', '')
    const res = (status, d) => ({ ok: status < 300, status, json: async () => d })
    try {
      if (ruta === '/api/registrar') return res(200, { ok: true, ...(await SV.registrarInstalacion({ almacen, cfg, ip: '1.1.1.1' })) })
      if (ruta === '/api/sync') { await SV.autenticar({ almacen, cfg, id: op.headers['x-instalacion'], clave: op.headers['x-clave'] }); return res(200, await SV.sincronizar({ almacen, cfg, instalacionId: op.headers['x-instalacion'], cuerpo: JSON.parse(op.body) })) }
      if (ruta.startsWith('/api/top')) return res(200, { ok: true, ...(await SV.top({ almacen, campo: new URL(url).searchParams.get('campo') })) })
    } catch (e) { return res(e.estado || 500, { ok: false, error: e.message }) }
    return res(404, {})
  }
  const r = rutas(); limpiarRutas(r)
  const n = nuevoNumero()
  db.guardarUsuario(n, { monedas: 700, xp: 450, nombre: 'Contrato', mensajes: 4, actualizado: Date.now() })
  T.registrar(n, 'minar', 90)
  await S.sincronizarAhora({ ajustes, fetchFn, rutas: r })
  let u = db.obtenerUsuario(n)
  assert.deepEqual([u.monedas, u.xp, u.nivel, u.nombre], [700, 450, 2, 'Contrato'])
  // "otra instalación" gana 300 monedas en el servidor
  const { instalacion } = { instalacion: await SV.registrarInstalacion({ almacen, cfg, ip: '2.2.2.2' }) }
  await SV.sincronizar({ almacen, cfg, instalacionId: instalacion.id, cuerpo: { usuarios: { [n]: { vis: '519•••123', u: { r: { actualizado: Date.now() + 5 }, d: { monedas: 300 } } } } } })
  db.guardarUsuario(n, { monedas: db.obtenerUsuario(n).monedas + 50 })
  await S.sincronizarAhora({ ajustes, fetchFn, rutas: r })
  u = db.obtenerUsuario(n)
  assert.equal(u.monedas, 1050, '700 + 300 de la otra instalación + 50 locales')
  // (el servidor también recibió a otros usuarios de pruebas anteriores, así que se busca la fila de esta persona)
  assert.ok((await SV.top({ almacen, campo: 'monedas', limite: 25 })).top.some((f) => f.valor === 1050 && f.visible === '519•••999'.replace('999', n.slice(-3))))
  assert.ok((await SV.top({ almacen, campo: 'trabajos', limite: 25 })).top.some((f) => f.valor === 90))
})
