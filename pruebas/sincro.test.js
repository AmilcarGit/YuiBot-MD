import test from 'node:test'
import assert from 'node:assert/strict'
import { construirEnvio, aplicarRespuesta, telefonoValido } from '../nucleo/sincro.js'
import { ganarXp, semanaActual } from '../nucleo/juego.js'

const jugador = extra => ({
  registrado: true, nombre: 'Ana', monedas: 500, xp: 100, nivel: 3, mensajes: 20, racha: 2,
  ultimoDaily: 5, ultimoXp: 6, trabajo: 'granjero', inventario: { pico: true }, logros: ['primerTrabajo'],
  semana: '2026-11-16', xpSemana: 30, trabajosGanado: 200, veces: { granjero: 2 }, ...extra
})
const vacio = () => ({ usuarios: {}, epoca: '' })

test('solo se envían registrados con teléfono real (nunca LID de 15 dígitos)', () => {
  const { envio } = construirEnvio({
    51900000001: jugador(),
    51900000002: jugador({ registrado: false }),
    123456789012345: jugador()
  }, vacio())
  assert.deepEqual(Object.keys(envio), ['51900000001'])
  assert.equal(telefonoValido('123456789012345'), false)
})

test('la primera vez va como semilla, sin nombre, con el número enmascarado', () => {
  const { envio } = construirEnvio({ 51900000001: jugador() }, vacio(), 1000)
  const item = envio['51900000001']
  assert.equal(item.u.semilla, true)
  assert.equal(item.u.d.monedas, 500)
  assert.equal(item.vis, '519•••001')
  assert.equal(JSON.stringify(item).includes('Ana'), false)
  assert.deepEqual(item.u.r.inventario, ['pico'])
  assert.deepEqual(item.u.r.logros, { primerTrabajo: 1 })
  assert.deepEqual(item.t.d, { ganado: 200, veces: { granjero: 2 } })
})

test('después solo se mandan diferencias y, sin cambios, no se manda nada', () => {
  const u = jugador()
  const estado = vacio()
  const primero = construirEnvio({ 51900000001: u }, estado)
  aplicarRespuesta({ 51900000001: u }, estado, primero.envio, primero.enviados, { epoca: 'e1', usuarios: { 51900000001: { u: { monedas: 500, xp: 100 } } }, errores: {} })
  assert.equal(Object.keys(construirEnvio({ 51900000001: u }, estado).envio).length, 0)

  u.monedas -= 120
  u.xp += 25
  u.veces.granjero++
  u.trabajosGanado += 90
  const { envio } = construirEnvio({ 51900000001: u }, estado)
  const item = envio['51900000001']
  assert.equal(item.u.semilla, undefined)
  assert.equal(item.u.d.monedas, -120)
  assert.equal(item.u.d.xp, 25)
  assert.deepEqual(item.t.d, { ganado: 90, veces: { granjero: 1 } })
})

test('los topes por sincronización se respetan y el resto queda para la siguiente', () => {
  const u = jugador()
  const estado = vacio()
  estado.usuarios[51900000001] = { monedas: 0, xp: 100, mensajes: 20, trabajosGanado: 200, trabajosVeces: 2, veces: { granjero: 2 }, semana: u.semana, xpSemana: 30, h: 'x' }
  u.monedas = 350000
  const { envio, enviados } = construirEnvio({ 51900000001: u }, estado)
  assert.equal(envio['51900000001'].u.d.monedas, 100000)
  aplicarRespuesta({ 51900000001: u }, estado, envio, enviados, { usuarios: { 51900000001: { u: { monedas: 100000, xp: 100 } } }, errores: {} })
  assert.equal(u.monedas, 350000, 'el bot no pierde monedas por el tope')
  assert.equal(estado.usuarios[51900000001].monedas, 100000)
  assert.equal(construirEnvio({ 51900000001: u }, estado).envio['51900000001'].u.d.monedas, 100000, 'se sigue subiendo')
})

test('lo que ganó otra instalación se suma al bot, el nivel se recalcula y se unen inventario y logros', () => {
  const u = jugador()
  const estado = vacio()
  const { envio, enviados } = construirEnvio({ 51900000001: u }, estado)
  aplicarRespuesta({ 51900000001: u }, estado, envio, enviados, {
    epoca: 'e1',
    usuarios: { 51900000001: { u: { monedas: 800, xp: 2000, inventario: ['pico', 'mochila'], logros: { racha7: 1 }, ultimoDaily: 99 } } },
    errores: {}
  })
  assert.equal(u.monedas, 800)
  assert.equal(u.xp, 2000)
  assert.equal(u.nivel, Math.floor(Math.sqrt(2000 / 20)) + 1)
  assert.equal(u.inventario.mochila, true)
  assert.deepEqual(u.logros, ['primerTrabajo', 'racha7'])
  assert.equal(u.ultimoDaily, 99)
  assert.equal(estado.epoca, 'e1')
})

test('si el bot ganó monedas mientras se sincronizaba, no se pierden', () => {
  const u = jugador()
  const estado = vacio()
  const { envio, enviados } = construirEnvio({ 51900000001: u }, estado)
  u.monedas += 40
  aplicarRespuesta({ 51900000001: u }, estado, envio, enviados, { usuarios: { 51900000001: { u: { monedas: 500, xp: 100 } } }, errores: {} })
  assert.equal(u.monedas, 540)
  assert.equal(construirEnvio({ 51900000001: u }, estado).envio['51900000001'].u.d.monedas, 40)
})

test('un reinicio de la base vacía la memoria de lo enviado y se vuelve a subir como semilla', () => {
  const u = jugador()
  const estado = vacio()
  const { envio, enviados } = construirEnvio({ 51900000001: u }, estado)
  aplicarRespuesta({ 51900000001: u }, estado, envio, enviados, { usuarios: { 51900000001: { u: { monedas: 500, xp: 100 } } }, errores: {} })
  assert.equal(aplicarRespuesta({ 51900000001: u }, estado, {}, {}, { reinicio: true, epoca: 'nueva', usuarios: {}, errores: {} }), 'reinicio')
  assert.equal(estado.epoca, 'nueva')
  assert.equal(construirEnvio({ 51900000001: u }, estado).envio['51900000001'].u.semilla, true)
})

test('un jugador "ocupado" se reintenta y uno rechazado no se queda en bucle', () => {
  const u = jugador()
  const estado = vacio()
  const { envio, enviados } = construirEnvio({ 51900000001: u }, estado)
  aplicarRespuesta({ 51900000001: u }, estado, envio, enviados, { usuarios: {}, errores: { 51900000001: 'ocupado' } })
  assert.equal(estado.usuarios[51900000001], undefined)
  aplicarRespuesta({ 51900000001: u }, estado, envio, enviados, { usuarios: {}, errores: { 51900000001: 'registro inválido' } })
  assert.equal(Object.keys(construirEnvio({ 51900000001: u }, estado).envio).length, 0)
})

test('ganarXp lleva la cuenta semanal y la reinicia al cambiar de semana', () => {
  const u = jugador({ semana: '2000-01-03', xpSemana: 999 })
  ganarXp(u, 10)
  assert.equal(u.semana, semanaActual())
  assert.equal(u.xpSemana, 10)
  ganarXp(u, 5)
  assert.equal(u.xpSemana, 15)
  assert.equal(semanaActual(Date.UTC(2026, 10, 22, 12)), '2026-11-16')
})
