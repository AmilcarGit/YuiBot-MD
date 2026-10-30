// Comandos escolares: tareas, horario, notas, exámenes, pomodoro y matemática.
const test = require('node:test')
const assert = require('node:assert/strict')
const path = require('path')
const { respaldar } = require('./_util')

const RAIZ = path.join(__dirname, '..')
const restaurar = respaldar([path.join(RAIZ, 'data', 'escuela.json'), path.join(RAIZ, 'data', 'recordatorios.json')])
test.after(() => restaurar())

const config = require('../defaults')
const escuela = require('../lib/escuela')
const mate = require('../lib/escuelaMate')
const recordatorios = require('../lib/recordatorios')
const cmd = (n) => require(`../modulos/escuela/${n}`)

// Los títulos y etiquetas de caja() usan negrita Unicode: se vuelve a ASCII para comparar.
function desnegrita(texto) {
  return Array.from(String(texto), (ch) => {
    const c = ch.codePointAt(0)
    if (c >= 0x1d5d4 && c <= 0x1d5ed) return String.fromCharCode(65 + c - 0x1d5d4)
    if (c >= 0x1d5ee && c <= 0x1d607) return String.fromCharCode(97 + c - 0x1d5ee)
    if (c >= 0x1d7ec && c <= 0x1d7f5) return String.fromCharCode(48 + c - 0x1d7ec)
    return ch
  }).join('')
}

function bot() {
  const enviados = []
  const todos = []
  return { enviados, sendMessage: async (j, c) => { if (c.react) return; enviados.push(desnegrita(c.text)); todos.push(c) }, todos }
}
let contador = 0
function usuario() {
  const numero = `5198800${String(++contador).padStart(4, '0')}`
  return { numero, msg: { key: { remoteJid: 'g@g.us', participant: `${numero}@s.whatsapp.net` }, message: {} } }
}
let ultimoSock = null
const ejecutar = (nombre, u, args, extra = {}) => {
  const sock = (ultimoSock = bot())
  return cmd(nombre).execute(sock, u.msg, args, { config, ...extra }).then(() => sock.enviados)
}

// ── Lógica pura ───────────────────────────────────────────────────────
test('leerNota entiende nota y peso y rechaza lo inválido', () => {
  assert.deepEqual(escuela.leerNota('15'), { nota: 15, peso: 1 })
  assert.deepEqual(escuela.leerNota('14,5x30'), { nota: 14.5, peso: 30 })
  for (const mala of ['21', 'abc', '15x0', '-3', '']) assert.equal(escuela.leerNota(mala), null)
})

test('promedios simples, ponderados y por materia', () => {
  assert.equal(escuela.promedio([{ nota: 10 }, { nota: 20 }]), 15)
  assert.equal(escuela.promedio([{ nota: 10, peso: 1 }, { nota: 20, peso: 3 }]), 17.5)
  assert.equal(escuela.promedio([]), null)
  const r = escuela.resumenNotas([
    { materia: 'Matemática', nota: 10 }, { materia: 'matematica', nota: 14 }, { materia: 'Arte', nota: 18 },
  ])
  assert.equal(r.materias.length, 2)
  assert.equal(r.materias.find((m) => m.materia === 'Matemática').promedio, 12)
  assert.equal(r.general, 15)
})

test('notaNecesaria: posible, ya alcanzada e imposible', () => {
  const act = [{ nota: 14, peso: 1 }, { nota: 12, peso: 1 }]
  assert.equal(escuela.notaNecesaria(act, 11).necesaria, 7)
  assert.equal(escuela.notaNecesaria(act, 11).estado, 'posible')
  assert.equal(escuela.notaNecesaria([{ nota: 20, peso: 1 }], 10).estado, 'ya')
  assert.equal(escuela.notaNecesaria([{ nota: 2, peso: 1 }], 18).estado, 'imposible')
})

test('rangoHora, diaDe y horaValida', () => {
  assert.deepEqual(escuela.rangoHora('8:00-9:30'), { inicio: '08:00', fin: '09:30' })
  assert.equal(escuela.rangoHora('10:00-09:00'), null)
  assert.equal(escuela.rangoHora('25:00'), null)
  assert.equal(escuela.diaDe('Miércoles'), 3)
  assert.equal(escuela.diaDe('sab'), 6)
  assert.equal(escuela.diaDe('nada'), null)
  assert.equal(escuela.diaDe('constructor'), null)
})

test('matemática: mcd, mcm, factorizar y primos', () => {
  assert.equal(mate.mcd(12, 18), 6)
  assert.equal(mate.mcm(4, 6), 12)
  assert.deepEqual(mate.factorizar(360), [[2, 3], [3, 2], [5, 1]])
  assert.equal(mate.factoresATexto(mate.factorizar(360)), '2³ × 3² × 5')
  assert.equal(mate.esPrimo(97), true)
  assert.equal(mate.esPrimo(1), false)
  assert.throws(() => mate.factorizar(1))
  assert.deepEqual(mate.divisores(12), [1, 2, 3, 4, 6, 12])
})

test('matemática: fracciones', () => {
  assert.deepEqual(mate.leerFraccion('6/8'), { n: 3, d: 4 })
  assert.deepEqual(mate.operarFracciones(mate.leerFraccion('1/2'), '+', mate.leerFraccion('3/4')), { n: 5, d: 4 })
  assert.equal(mate.mixto({ n: 7, d: 3 }), '2 1/3')
  assert.throws(() => mate.leerFraccion('1/0'))
  assert.throws(() => mate.operarFracciones(mate.leerFraccion('1/2'), '/', mate.leerFraccion('0')))
})

test('matemática: ecuaciones', () => {
  assert.deepEqual(mate.resolverEcuacion(1, -5, 6).raices, [3, 2])
  assert.equal(mate.resolverEcuacion(1, 2, 1).tipo, 'doble')
  assert.equal(mate.resolverEcuacion(1, 0, 1).tipo, 'complejas')
  assert.deepEqual(mate.resolverEcuacion(0, 2, -8).raices, [4])
  assert.equal(mate.resolverEcuacion(0, 0, 5).tipo, 'sin-solucion')
})

test('matemática: porcentajes y unidades', () => {
  assert.equal(mate.porcentajeDe(20, 150), 30)
  assert.equal(mate.quePorcentaje(30, 150), 20)
  assert.equal(mate.aplicarPorcentaje(150, -20), 120)
  assert.equal(mate.convertirUnidad(5, 'km', 'm').resultado, 5000)
  assert.equal(mate.convertirUnidad(100, 'c', 'f').resultado, 212)
  assert.equal(mate.convertirUnidad(1, 'gb', 'mb').resultado, 1024)
  assert.throws(() => mate.convertirUnidad(1, 'kg', 'm'))
})

// ── Comandos ──────────────────────────────────────────────────────────
test('.tarea guarda, lista, completa, elimina y limpia por persona', async () => {
  const u = usuario(), otro = usuario()
  let r = await ejecutar('tarea', u, ['agregar', 'Matemática', '-', 'Ejercicios', '1', 'al', '10', '|', '20/12'])
  assert.ok(r[0].includes('TAREA REGISTRADA'))
  r = await ejecutar('tarea', u, ['agregar', 'Sin', 'separador'])
  assert.ok(r[0].includes('" - "'))
  r = await ejecutar('tarea', u, ['agregar', 'Arte', '-', 'Dibujo', '|', 'fecha-mala'])
  assert.ok(r[0].includes('fecha'))
  await ejecutar('tarea', u, ['agregar', 'Arte', '-', 'Dibujo'])
  r = await ejecutar('tarea', u, ['lista'])
  assert.ok(r[0].includes('Matemática') && r[0].includes('Arte') && r[0].includes('2 pendiente'))
  r = await ejecutar('tarea', u, ['completar', '1'])
  assert.ok(r[0].includes('Completaste'))
  r = await ejecutar('tarea', u, ['completar', '9'])
  assert.ok(r[0].includes('No encontré'))
  r = await ejecutar('tarea', otro, ['lista'])
  assert.ok(!r[0].includes('TUS TAREAS')) // las tareas son de cada persona
  r = await ejecutar('tarea', u, ['limpiar'])
  assert.ok(r[0].includes('1 tarea'))
  r = await ejecutar('tarea', u, ['eliminar', '1'])
  assert.ok(r[0].includes('Eliminada'))
})

test('.misclases: agregar, evitar choques, ver día y borrar', async () => {
  const u = usuario()
  let r = await ejecutar('misclases', u, ['add', 'lunes', '08:00-09:30', 'Matemática'])
  assert.ok(r[0].includes('Agregado'))
  r = await ejecutar('misclases', u, ['add', 'lunes', '08:00', 'Física'])
  assert.ok(r[0].includes('Ya tienes'))
  r = await ejecutar('misclases', u, ['add', 'viernes', '99:00', 'X'])
  assert.ok(r[0].includes('Faltan datos'))
  await ejecutar('misclases', u, ['add', 'martes', '10:00', 'Arte'])
  r = await ejecutar('misclases', u, ['lunes'])
  assert.ok(r[0].includes('Matemática') && !r[0].includes('Arte'))
  r = await ejecutar('misclases', u, [])
  assert.ok(r[0].includes('LUNES') && r[0].includes('MARTES'))
  r = await ejecutar('misclases', u, ['borrar', '1'])
  assert.ok(r[0].includes('Quitada'))
  r = await ejecutar('misclases', u, ['jueves'])
  assert.ok(r[0].includes('Sin clases'))
})

test('.libreta guarda notas y calcula promedios', async () => {
  const u = usuario()
  let r = await ejecutar('libreta', u, ['add', 'Matemática', '14'])
  assert.ok(r[0].includes('NOTA GUARDADA'))
  r = await ejecutar('libreta', u, ['add', 'Matemática', '8'])
  assert.ok(r[0].includes('11')) // promedio 11
  await ejecutar('libreta', u, ['add', 'Arte', '18'])
  r = await ejecutar('libreta', u, [])
  assert.ok(r[0].includes('Promedio general') && r[0].includes('14.5'))
  r = await ejecutar('libreta', u, ['matematica'])
  assert.ok(r[0].includes('Promedio: 11'))
  r = await ejecutar('libreta', u, ['add', 'Arte', '25'])
  assert.ok(r[0].includes('0 a 20'))
  r = await ejecutar('libreta', u, ['borrar', 'Arte'])
  assert.ok(r[0].includes('Quité'))
  r = await ejecutar('libreta', u, ['borrar', 'todo'])
  assert.ok(r[0].includes('Borré'))
})

test('.promediar y .notaminima', async () => {
  const u = usuario()
  let r = await ejecutar('promediar', u, ['15', '14', '18'])
  assert.ok(r[0].includes('15.67'))
  r = await ejecutar('promediar', u, ['10x1', '20x3'])
  assert.ok(r[0].includes('Ponderado') && r[0].includes('17.5'))
  r = await ejecutar('promediar', u, ['abc'])
  assert.ok(r[0].includes('0 a 20'))
  r = await ejecutar('notaminima', u, ['11', '14', '12'])
  assert.ok(r[0].includes('7'))
  r = await ejecutar('notaminima', u, ['18', '2', 'falta=1'])
  assert.ok(r[0].includes('más que la nota máxima'))
  r = await ejecutar('notaminima', u, ['10', '20'])
  assert.ok(r[0].includes('Ya alcanzaste'))
  r = await ejecutar('notaminima', u, [])
  assert.ok(r[0].includes('meta'))
})

test('.misexamenes agenda con avisos y los borra', async () => {
  const u = usuario()
  const { leerExamen } = cmd('misexamenes')._internos
  assert.equal(leerExamen(['Matemática']), null)
  assert.equal(leerExamen(['15/11']), null)
  const e = leerExamen(['Historia', 'del', 'Perú', 'mañana', '09:30', 'Virreinato', 'y', 'Colonia'])
  assert.equal(e.materia, 'Historia del Perú')
  assert.equal(e.tema, 'Virreinato y Colonia')

  // Dentro de 3 días (hora de Perú): así el aviso de "1 día antes" siempre está en el futuro, sea la hora que sea.
  const en3 = new Date(Date.now() - 5 * 3600000 + 3 * 86400000)
  const fecha3 = `${String(en3.getUTCDate()).padStart(2, '0')}/${String(en3.getUTCMonth() + 1).padStart(2, '0')}/${en3.getUTCFullYear()}`
  let r = await ejecutar('misexamenes', u, ['add', 'Matemática', fecha3, '23:00', 'Álgebra'], { esSubBot: true, subbotNumero: '5111' })
  assert.ok(r[0].includes('EXAMEN AGENDADO'), r[0])
  const avisos = recordatorios.listarDe(u.numero)
  assert.equal(avisos.length, 2) // 1 día antes y 1 h antes
  assert.ok(avisos.every((a) => a.idBot === '5111' && a.jid === `${u.numero}@s.whatsapp.net`))
  r = await ejecutar('misexamenes', u, [])
  assert.ok(r[0].includes('Matemática') && r[0].includes('Álgebra'))
  r = await ejecutar('misexamenes', u, ['add', 'Arte', '01/01/2020', '08:00'])
  assert.ok(r[0].includes('ya pasó'))
  r = await ejecutar('misexamenes', u, ['borrar', '1'])
  assert.ok(r[0].includes('eliminado'))
  assert.equal(recordatorios.listarDe(u.numero).length, 0) // se quitaron los avisos
})

test('.pomodoro crea dos recordatorios y valida minutos', async () => {
  const u = usuario()
  let r = await ejecutar('pomodoro', u, ['30', '10'])
  assert.ok(r[0].includes('POMODORO INICIADO'))
  const lista = recordatorios.listarDe(u.numero)
  assert.equal(lista.length, 2)
  assert.ok(Math.abs((lista[1].cuando - lista[0].cuando) - 10 * 60000) < 1000)
  r = await ejecutar('pomodoro', u, ['0'])
  assert.ok(r[0].includes('minutos enteros'))
  for (const x of lista) recordatorios.borrar(u.numero, x.id)
})

test('comandos de matemática responden bien y con errores claros', async () => {
  const u = usuario()
  assert.ok((await ejecutar('ecuacion', u, ['1', '-5', '6']))[0].includes('x1'))
  assert.ok((await ejecutar('ecuacion', u, ['2', '-8']))[0].includes('x'))
  assert.ok((await ejecutar('ecuacion', u, ['hola']))[0].includes('coeficientes'))
  assert.ok((await ejecutar('mcm', u, ['12', '18', '30']))[0].includes('180'))
  assert.ok((await ejecutar('mcm', u, ['12']))[0].includes('2 a 8'))
  assert.ok((await ejecutar('factorizar', u, ['360']))[0].includes('2³ × 3² × 5'))
  assert.ok((await ejecutar('factorizar', u, ['1']))[0].includes('❌'))
  assert.ok((await ejecutar('fraccion', u, ['6/8']))[0].includes('3/4'))
  assert.ok((await ejecutar('fraccion', u, ['1/2', '+', '3/4']))[0].includes('1 1/4'))
  assert.ok((await ejecutar('fraccion', u, ['1/0']))[0].includes('denominador'))
  assert.ok((await ejecutar('unidades', u, ['5', 'km', 'm']))[0].includes('5000'))
  assert.ok((await ejecutar('unidades', u, ['5km', 'a', 'm']))[0].includes('5000'))
  assert.ok((await ejecutar('unidades', u, ['5', 'kg', 'm']))[0].includes('mismo tipo'))
  assert.ok((await ejecutar('unidades', u, ['lista']))[0].includes('temperatura'))
  assert.ok((await ejecutar('porcentaje', u, ['20', 'de', '150']))[0].includes('30'))
  assert.ok((await ejecutar('porcentaje', u, ['30', 'sobre', '150']))[0].includes('20%'))
  assert.ok((await ejecutar('porcentaje', u, ['150', '-20']))[0].includes('120'))
  assert.ok((await ejecutar('porcentaje', u, ['x']))[0].includes('No entendí'))
  const tabla = (await ejecutar('tablamult', u, ['7']))[0]
  assert.ok(tabla.includes('7 × 12 = *84*'))
  assert.ok((await ejecutar('tablamult', u, ['x']))[0].includes('❌'))
})

// ── .tarea interactiva ────────────────────────────────────────────────
const ui = require('../lib/tareasUI')
const resumenDiario = require('../lib/resumenDiario')

test('buscarTarea acepta #id estable y posición', () => {
  const t = [{ id: 7, materia: 'A' }, { id: 9, materia: 'B' }]
  assert.equal(ui.buscarTarea(t, '#9').indice, 1)
  assert.equal(ui.buscarTarea(t, '1').tarea.id, 7)
  for (const mala of ['#1', '3', '0', 'x', '', undefined]) assert.equal(ui.buscarTarea(t, mala), null)
})

test('la lista desplegable respeta los límites de WhatsApp', () => {
  const ahora = Date.now()
  const tareas = Array.from({ length: 20 }, (_, i) => ({ id: i + 1, materia: `Materia larguísima número ${i}`, texto: 'x'.repeat(200), hecha: i % 5 === 0, entrega: i % 2 ? ahora + (i + 1) * 3600000 : null }))
  const secciones = ui.seccionesLista(tareas, '!', ahora)
  const filas = secciones.flatMap((s) => s.rows)
  assert.ok(filas.length <= 10)
  for (const s of secciones) assert.ok(s.title.length <= 24)
  for (const f of filas) assert.ok(f.title.length <= 24 && f.description.length <= 72 && f.id.startsWith('!tarea '))
  assert.ok(!filas.some((f) => f.id === '!tarea ver #1')) // la #1 está hecha
  // pendientes con fecha primero
  assert.equal(secciones[0].rows[0].id, '!tarea ver #2')
})

test('.tarea sin tareas ofrece ayuda con botón de copiar plantilla', async () => {
  const u = usuario()
  await ejecutar('tarea', u, [])
  const c = ultimoSock.todos[0]
  assert.ok(c.buttons.some((b) => b.copy && b.copy.includes('tarea agregar')))
  assert.ok(ultimoSock.enviados[0].includes('AGREGAR TAREA'))
})

test('.tarea con tareas envía lista desplegable y cae a botones y texto si falla', async () => {
  const u = usuario()
  await ejecutar('tarea', u, ['agregar', 'Arte', '-', 'Dibujo'])
  await ejecutar('tarea', u, [])
  const c = ultimoSock.todos[0]
  assert.ok(c.buttons[0].sections.length >= 1)

  const sock = { enviados: [], sendMessage: async (j, c2) => { if (c2.react) return; if (c2.buttons?.[0]?.sections) throw new Error('sin listas'); sock.enviados.push(c2) } }
  const log = console.error; console.error = () => {}
  try { await cmd('tarea').execute(sock, u.msg, [], { config }) } finally { console.error = log }
  assert.ok(sock.enviados[0].buttons.every((b) => b.id))

  const sock2 = { enviados: [], sendMessage: async (j, c2) => { if (c2.react) return; if (c2.buttons) throw new Error('sin botones'); sock2.enviados.push(c2) } }
  console.error = () => {}
  try { await cmd('tarea').execute(sock2, u.msg, [], { config }) } finally { console.error = log }
  assert.ok(sock2.enviados[0].text.includes('Arte') && !sock2.enviados[0].buttons)
})

test('.tarea ver/completar/eliminar por #id con botones y avisos automáticos', async () => {
  const u = usuario()
  const mañana = new Date(Date.now() + 3 * 86400000)
  const fecha = `${String(mañana.getUTCDate()).padStart(2, '0')}/${String(mañana.getUTCMonth() + 1).padStart(2, '0')}`
  await ejecutar('tarea', u, ['agregar', 'Física', '-', 'Informe', '|', fecha], { esSubBot: true, subbotNumero: '5222' })
  const tarjeta = ultimoSock.todos[0]
  assert.ok(tarjeta.buttons.some((b) => b.id.includes('completar #')))
  const avisos = recordatorios.listarDe(u.numero)
  assert.equal(avisos.length, 2) // el día anterior 18:00 y el mismo día 7:00
  assert.ok(avisos.every((a) => a.idBot === '5222' && a.botones?.length === 2 && a.jid === `${u.numero}@s.whatsapp.net`))

  const id = tarjeta.buttons.find((b) => b.id.includes('completar #')).id.split('#')[1]
  await ejecutar('tarea', u, ['ver', `#${id}`])
  assert.ok(ultimoSock.enviados[0].includes('FÍSICA') || ultimoSock.enviados[0].includes('Física'))
  await ejecutar('tarea', u, ['completar', `#${id}`])
  assert.ok(ultimoSock.enviados[0].includes('Completaste'))
  assert.equal(recordatorios.listarDe(u.numero).length, 0) // al completar se cancelan los avisos
  await ejecutar('tarea', u, ['completar', `#${id}`])
  assert.ok(ultimoSock.enviados[0].includes('ya estaba'))
  await ejecutar('tarea', u, ['eliminar', `#${id}`])
  assert.ok(ultimoSock.enviados[0].includes('Eliminada'))
  await ejecutar('tarea', u, ['ver', '#999'])
  assert.ok(ultimoSock.enviados[0].includes('No encontré'))
})

test('el recordatorio con botones cae a texto simple si WhatsApp los rechaza', async () => {
  const u = usuario()
  recordatorios.crear({ idBot: 'principal', jid: 'x@s.whatsapp.net', numero: u.numero, texto: 'hola', cuando: Date.now() - 5, botones: [{ text: 'OK', id: '!x' }] })
  const intentos = []
  const sock = { sendMessage: async (j, c) => { intentos.push(c); if (c.buttons) throw new Error('no') } }
  assert.equal(await recordatorios.procesar(sock, 'principal'), 1)
  assert.equal(intentos.length, 2)
  assert.ok(!intentos[1].buttons)
})

test('resumen diario: contenido, activación y envío una sola vez al día', async () => {
  const u = usuario()
  const ahora = Date.UTC(2026, 9, 26, 13, 0) // lunes 08:00 en Perú
  const d = escuela.abrir(u.numero)
  assert.equal(resumenDiario.construirResumen(d.ficha, ahora), null) // nada que contar
  d.ficha.horario.push({ dia: 1, inicio: '08:00', fin: '09:00', materia: 'Matemática' })
  d.ficha.tareas.push({ id: 1, materia: 'Arte', texto: 'Dibujo', hecha: false, entrega: ahora + 86400000 })
  d.ficha.examenes.push({ id: 2, materia: 'Historia', cuando: ahora + 2 * 86400000, tema: '' })
  d.guardar()
  const r = resumenDiario.construirResumen(escuela.abrir(u.numero).ficha, ahora, '!')
  const plano = desnegrita(r.texto)
  assert.ok(plano.includes('Matemática') && plano.includes('Arte') && plano.includes('Historia'))
  assert.equal(r.botones.length, 3)

  await ejecutar('tarea', u, ['resumen', 'on'])
  assert.ok(ultimoSock.enviados[0].includes('7:00'))
  assert.equal(escuela.abrir(u.numero).ficha.resumenBot, 'principal')

  const enviados = []
  const sock = { sendMessage: async (j, c) => { enviados.push([j, c]) } }
  assert.equal(await resumenDiario.procesar(sock, 'principal', Date.UTC(2026, 9, 26, 11, 0)), 0) // 06:00: muy temprano
  assert.equal(await resumenDiario.procesar(sock, 'otro-bot', ahora), 0) // lo manda solo el bot donde se activó
  assert.equal(await resumenDiario.procesar(sock, 'principal', Date.UTC(2026, 9, 26, 18, 0)), 0) // 13:00: pasó la ventana
  assert.equal(await resumenDiario.procesar(sock, 'principal', ahora), 1)
  assert.equal(enviados[0][0], `${u.numero}@s.whatsapp.net`)
  assert.equal(await resumenDiario.procesar(sock, 'principal', ahora + 60000), 0) // ya se envió hoy

  await ejecutar('tarea', u, ['resumen', 'off'])
  assert.equal(escuela.abrir(u.numero).ficha.resumenDiario, false)
})
