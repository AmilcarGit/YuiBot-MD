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
  return { enviados, sendMessage: async (j, c) => { enviados.push(desnegrita(c.text)) } }
}
let contador = 0
function usuario() {
  const numero = `5198800${String(++contador).padStart(4, '0')}`
  return { numero, msg: { key: { remoteJid: 'g@g.us', participant: `${numero}@s.whatsapp.net` }, message: {} } }
}
const ejecutar = (nombre, u, args, extra = {}) => {
  const sock = bot()
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
  assert.ok(r[0].includes('número'))
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

  let r = await ejecutar('misexamenes', u, ['add', 'Matemática', 'mañana', '23:00', 'Álgebra'], { esSubBot: true, subbotNumero: '5111' })
  assert.ok(r[0].includes('EXAMEN AGENDADO'), r[0])
  const avisos = recordatorios.listarDe(u.numero)
  assert.equal(avisos.length, 2) // 1 día antes (ya pasó? no: mañana 23:00 - 1 d = hoy 23:00) y 1 h antes
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
