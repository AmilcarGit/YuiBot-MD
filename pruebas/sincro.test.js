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
  assert.equal(u.nivel, Math.floor(Math.sqrt(2000 / 10)) + 1)
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

test('con `previo`: lo gastado o ganado desde la web llega al bot y lo recortado sigue pendiente', () => {
  const u = jugador({ monedas: 1000 })
  const estado = vacio()
  estado.usuarios[51900000001] = { monedas: 1000, xp: 100, mensajes: 20, trabajosGanado: 200, trabajosVeces: 2, veces: { granjero: 2 }, semana: u.semana, xpSemana: 30, h: 'x' }
  u.monedas = 1100 // el bot ganó 100
  const { envio, enviados } = construirEnvio({ 51900000001: u }, estado)
  // En la web se gastaron 400 (el servidor tenía 600) y el servidor aceptó nuestros +100 → 700
  aplicarRespuesta({ 51900000001: u }, estado, envio, enviados, {
    usuarios: { 51900000001: { u: { monedas: 700, xp: 100 }, previo: { monedas: 600, xp: 100 } } }, errores: {}
  })
  assert.equal(u.monedas, 700)
  assert.equal(estado.usuarios[51900000001].monedas, 700)
  assert.equal(Object.keys(construirEnvio({ 51900000001: u }, estado).envio).length, 0, 'quedan iguales')

  // El servidor recortó el aumento por el tope por hora: el bot conserva lo que falta
  u.monedas = 700 + 300
  const otro = construirEnvio({ 51900000001: u }, estado)
  aplicarRespuesta({ 51900000001: u }, estado, otro.envio, otro.enviados, {
    usuarios: { 51900000001: { u: { monedas: 800, xp: 100 }, previo: { monedas: 700, xp: 100 } } }, errores: {}
  })
  assert.equal(u.monedas, 1000)
  assert.equal(construirEnvio({ 51900000001: u }, estado).envio['51900000001'].u.d.monedas, 200)
})

test('el descanso del trabajo, la colección y el daily de la web se reflejan en el bot', () => {
  const u = jugador({ ultimoTrabajo: 10, esperaTrabajo: 100, coleccion: { Aprendiz: 1 } })
  const estado = vacio()
  const { envio, enviados } = construirEnvio({ 51900000001: u }, estado)
  aplicarRespuesta({ 51900000001: u }, estado, envio, enviados, {
    usuarios: { 51900000001: { u: { monedas: 500, xp: 100, ultimoTrabajo: 999, esperaTrabajo: 1800000, ultimoDaily: 77, ultimoAdivina: 5, coleccion: { Aprendiz: 3, Hechicera: 1 } }, previo: { monedas: 0, xp: 0 } } }, errores: {}
  })
  assert.equal(u.ultimoTrabajo, 999)
  assert.equal(u.esperaTrabajo, 1800000)
  assert.equal(u.ultimoDaily, 77)
  assert.deepEqual(u.coleccion, { Aprendiz: 3, Hechicera: 1 })
})

test('sin cambios, cada cierto tiempo se consulta al servidor sin pisar lo hecho en la web', () => {
  const u = jugador()
  const estado = vacio()
  const primero = construirEnvio({ 51900000001: u }, estado, 1000)
  aplicarRespuesta({ 51900000001: u }, estado, primero.envio, primero.enviados, { usuarios: { 51900000001: { u: { monedas: 500, xp: 100 }, previo: { monedas: 0, xp: 0 } } }, errores: {} }, 1000)
  assert.equal(Object.keys(construirEnvio({ 51900000001: u }, estado, 2000).envio).length, 0, 'recién consultado')
  const latido = construirEnvio({ 51900000001: u }, estado, 1000 + 700000)
  const item = latido.envio['51900000001']
  assert.ok(item, 'toca consultar')
  assert.equal(item.u.r.actualizado, 1000, 'conserva la hora del último cambio real del bot')
  assert.equal(Object.values(item.u.d).some(Boolean), false)
})

test('si la racha y el trabajo cambiaron en la web, el bot los adopta', () => {
  const u = jugador({ ultimoDaily: 5, racha: 1, trabajo: 'granjero', ultimoTrabajo: 10 })
  const estado = vacio()
  const { envio, enviados } = construirEnvio({ 51900000001: u }, estado)
  aplicarRespuesta({ 51900000001: u }, estado, envio, enviados, { usuarios: { 51900000001: { u: { monedas: 500, xp: 100, ultimoDaily: 99, racha: 4, ultimoTrabajo: 99, trabajo: 'minero' }, previo: { monedas: 0, xp: 0 } } }, errores: {} })
  assert.equal(u.racha, 4)
  assert.equal(u.trabajo, 'minero')
})

test('la base oficial es el valor por defecto y se puede cambiar o apagar con DATOS_URL', async () => {
  const leer = async valor => {
    const previo = process.env.DATOS_URL
    if (valor === undefined) delete process.env.DATOS_URL
    else process.env.DATOS_URL = valor
    const { default: ajustes } = await import(`../ajustes.js?x=${Math.random()}`)
    if (previo === undefined) delete process.env.DATOS_URL
    else process.env.DATOS_URL = previo
    return ajustes.datosUrl
  }
  assert.equal(await leer(undefined), 'https://yuibot-datos.vercel.app')
  assert.equal(await leer(''), 'https://yuibot-datos.vercel.app')
  assert.equal(await leer('https://otra.vercel.app'), 'https://otra.vercel.app')
  assert.equal(await leer('off'), '')
})
