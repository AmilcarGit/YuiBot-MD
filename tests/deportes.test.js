// Fútbol en vivo (datos simulados con el formato público de ESPN) y "ver una vez".
const test = require('node:test')
const assert = require('node:assert/strict')
const path = require('path')
const { respaldar } = require('./_util')

const restaurar = respaldar([path.join(__dirname, '..', 'data', 'futbol.json')])
test.after(() => restaurar())

const config = require('../defaults')
const futbol = require('../lib/futbol')
const alertas = require('../lib/alertasFutbol')

function desnegrita(texto) {
  return Array.from(String(texto), (ch) => {
    const c = ch.codePointAt(0)
    if (c >= 0x1d5d4 && c <= 0x1d5ed) return String.fromCharCode(65 + c - 0x1d5d4)
    if (c >= 0x1d5ee && c <= 0x1d607) return String.fromCharCode(97 + c - 0x1d5ee)
    if (c >= 0x1d7ec && c <= 0x1d7f5) return String.fromCharCode(48 + c - 0x1d7ec)
    return ch
  }).join('')
}

// ── Datos de prueba con la forma de la API de ESPN ────────────────────
function evento({ id = '1', fecha = new Date().toISOString(), estado = 'pre', nombreEstado, reloj = "0'", local = 'Alianza Lima', visita = 'Universitario', gl = '0', gv = '0', detalles = [] } = {}) {
  const nombres = { pre: 'STATUS_SCHEDULED', in: 'STATUS_FIRST_HALF', post: 'STATUS_FULL_TIME' }
  return {
    id, date: fecha,
    status: { displayClock: reloj, type: { name: nombreEstado || nombres[estado], state: estado, detail: reloj } },
    competitions: [{
      venue: { fullName: 'Estadio Alejandro Villanueva' },
      competitors: [
        { homeAway: 'home', score: gl, team: { id: '10', displayName: local, abbreviation: local.slice(0, 3).toUpperCase() } },
        { homeAway: 'away', score: gv, team: { id: '20', displayName: visita, abbreviation: visita.slice(0, 3).toUpperCase() } },
      ],
      details: detalles,
    }],
  }
}
const gol = (min, jugador, teamId, extra = {}) => ({ scoringPlay: true, clock: { displayValue: min }, team: { id: teamId }, athletesInvolved: [{ displayName: jugador }], ...extra })

function simularRed(rutas) {
  const original = globalThis.fetch
  const llamadas = []
  globalThis.fetch = async (url) => {
    llamadas.push(String(url))
    futbol._limpiarCache()
    for (const [fragmento, respuesta] of rutas) {
      if (String(url).includes(fragmento)) {
        if (respuesta instanceof Error) throw respuesta
        if (respuesta === 404) return { ok: false, status: 404, json: async () => ({}), headers: new Headers() }
        return { ok: true, status: 200, json: async () => respuesta, headers: new Headers() }
      }
    }
    return { ok: false, status: 404, json: async () => ({}), headers: new Headers() }
  }
  return { llamadas, restaurar: () => { globalThis.fetch = original; futbol._limpiarCache() } }
}

// ── Lógica ────────────────────────────────────────────────────────────
test('resolverLiga entiende claves, alias y nombres con acentos', () => {
  assert.equal(futbol.resolverLiga('Premier'), 'premier')
  assert.equal(futbol.resolverLiga('UCL'), 'champions')
  assert.equal(futbol.resolverLiga('liga 1'), 'liga1')
  assert.equal(futbol.resolverLiga('España'), 'laliga')
  assert.equal(futbol.resolverLiga('Copa Libertadores'), 'libertadores')
  assert.equal(futbol.resolverLiga('zzz'), null)
  assert.equal(futbol.resolverLiga(''), null)
})

test('las claves de liga y slugs no se repiten', () => {
  const slugs = Object.values(futbol.LIGAS).map((l) => l.slug)
  assert.equal(new Set(slugs).size, slugs.length)
  for (const c of futbol.LIGAS_PRINCIPALES) assert.ok(futbol.LIGAS[c], c)
})

test('normalizarEvento: estados, marcador, goles y rojas', () => {
  const p = futbol.normalizarEvento(evento({
    estado: 'in', reloj: "67'", gl: '2', gv: '1',
    detalles: [gol("12'", 'Hernández', '10'), gol("40'", 'Rivera', '20', { penaltyKick: true }), gol("60'", 'Quintero', '10', { ownGoal: true }), { redCard: true, clock: { displayValue: "55'" }, team: { id: '20' }, athletesInvolved: [{ displayName: 'Gómez' }] }],
  }), 'per.1', 'Liga 1 Perú')
  assert.equal(p.estado, 'vivo')
  assert.equal(p.local.goles, 2)
  assert.deepEqual(p.goles.map((g) => [g.min, g.lado, g.penal, g.autogol]), [["12'", 'local', false, false], ["40'", 'visita', true, false], ["60'", 'local', false, true]])
  assert.equal(p.rojas[0].lado, 'visita')
  assert.equal(futbol.normalizarEvento(evento({ nombreEstado: 'STATUS_HALFTIME', estado: 'in' }), 'x', 'X').estado, 'descanso')
  assert.equal(futbol.normalizarEvento(evento({ nombreEstado: 'STATUS_POSTPONED' }), 'x', 'X').estado, 'suspendido')
  assert.equal(futbol.normalizarEvento(evento({ estado: 'post' }), 'x', 'X').estado, 'final')
  assert.equal(futbol.normalizarEvento({ id: '9', competitions: [{ competitors: [] }] }, 'x', 'X'), null)
})

test('lineaPartido y textoDetallePartido', () => {
  const vivo = futbol.normalizarEvento(evento({ estado: 'in', reloj: "30'", gl: '1', gv: '0', detalles: [gol("12'", 'Hernández', '10')] }), 'x', 'X')
  assert.ok(futbol.lineaPartido(vivo).startsWith("🔴 30'") && futbol.lineaPartido(vivo).includes('*1 - 0*'))
  const pre = futbol.normalizarEvento(evento({ fecha: '2026-10-26T01:00:00Z' }), 'x', 'X') // 20:00 en Lima
  assert.ok(futbol.lineaPartido(pre).includes('20:00'))
  assert.ok(futbol.lineaPartido(pre, { conDia: true }).includes('25/10'))
  const det = futbol.textoDetallePartido(vivo).join('\n')
  assert.ok(det.includes('Hernández') && det.includes('Estadio Alejandro Villanueva'))
})

test('coincideEquipo busca por nombre parcial y sin acentos', () => {
  const e = { nombre: 'Atlético de Madrid', abrev: 'ATM' }
  assert.ok(futbol.coincideEquipo(e, 'atletico'))
  assert.ok(futbol.coincideEquipo(e, 'madrid'))
  assert.ok(futbol.coincideEquipo(e, 'atm'))
  assert.ok(!futbol.coincideEquipo(e, 'ba')) // muy corto
  assert.ok(!futbol.coincideEquipo(e, 'barcelona'))
})

test('obtenerPartidos pide el rango de fechas y tolera ligas sin datos (404)', async () => {
  const red = simularRed([['eng.1/scoreboard', { events: [evento({ id: '5', estado: 'in' })] }]])
  try {
    const ps = await futbol.obtenerPartidos('premier')
    assert.equal(ps.length, 1)
    assert.match(red.llamadas[0], /eng\.1\/scoreboard\?dates=\d{8}-\d{8}/)
    assert.equal(await futbol.obtenerPartidos('laliga'), null)
    await assert.rejects(futbol.obtenerPartidos('inventada'), /no válida/)
  } finally { red.restaurar() }
})

test('obtenerPartidos prueba otros formatos de fecha si ESPN responde HTTP 400', async () => {
  const original = globalThis.fetch
  const llamadas = []
  futbol._reiniciarVariante()
  globalThis.fetch = async (url) => {
    llamadas.push(String(url)); futbol._limpiarCache()
    if (/dates=\d{8}-\d{8}/.test(url)) return { ok: false, status: 400, text: async () => 'bad range', json: async () => ({}), headers: new Headers() }
    return { ok: true, status: 200, json: async () => ({ events: [evento({ id: '9' })] }), headers: new Headers() }
  }
  try {
    const ps = await futbol.obtenerPartidos('laliga')
    assert.equal(ps.length, 1) // eventos repetidos entre días se unen
    assert.ok(llamadas.some((u) => /dates=\d{8}$/.test(u)))
  } finally { globalThis.fetch = original; futbol._limpiarCache(); futbol._reiniciarVariante() }
})

test('variasLigas ignora las que fallan y las vacías', async () => {
  const red = simularRed([['eng.1/', { events: [evento()] }], ['esp.1/', new Error('boom')], ['ita.1/', { events: [] }]])
  const log = console.error; console.error = () => {}
  try {
    const grupos = await futbol.variasLigas(['premier', 'laliga', 'seriea'], (c) => futbol.obtenerPartidos(c))
    assert.deepEqual(grupos.map((g) => g.clave), ['premier'])
  } finally { red.restaurar(); console.error = log }
})

test('obtenerTabla lee posiciones y ordena', async () => {
  const entry = (nombre, rank, pj, w, t, l, dg, pts) => ({ team: { displayName: nombre }, stats: [['rank', rank], ['gamesPlayed', pj], ['wins', w], ['ties', t], ['losses', l], ['pointDifferential', dg], ['points', pts]].map(([name, value]) => ({ name, value })) })
  const red = simularRed([['standings', { children: [{ name: 'Liga', standings: { entries: [entry('Segundo FC', 2, 10, 6, 2, 2, 5, 20), entry('Primero FC', 1, 10, 8, 1, 1, 12, 25)] } }] }]])
  try {
    const t = await futbol.obtenerTabla('premier')
    assert.equal(t[0].filas[0].equipo, 'Primero FC')
    const texto = futbol.textoTabla(t).join('\n')
    assert.ok(texto.includes('Primero FC') && texto.includes('+12') && texto.includes('25'))
  } finally { red.restaurar() }
})

test('buscarEquipo reúne las ligas donde juega', async () => {
  const red = simularRed([['per.1/', { events: [evento({ id: '1', fecha: new Date(Date.now() + 3600000).toISOString() })] }], ['conmebol.libertadores/', { events: [evento({ id: '2', fecha: new Date(Date.now() + 86400000 * 3).toISOString() })] }]])
  try {
    const r = await futbol.buscarEquipo('alianza')
    assert.equal(r.nombre, 'Alianza Lima')
    assert.deepEqual([...r.claves].sort(), ['libertadores', 'liga1'])
    assert.equal(await futbol.buscarEquipo('equipoinexistente'), null)
  } finally { red.restaurar() }
})

// ── Alertas automáticas ───────────────────────────────────────────────
test('detectarEventos: inicio, gol, anulado, roja, descanso y final; sin avisos la primera vez', () => {
  const mk = (o) => futbol.normalizarEvento(evento(o), 'per.1', 'Liga 1 Perú')
  const { actual: a0, eventos: e0 } = alertas.detectarEventos(undefined, mk({ estado: 'in', gl: '1', gv: '0', reloj: "50'" }))
  assert.deepEqual(e0, []) // ya iba 1-0: no se repite como aviso
  const pre = alertas.detectarEventos(undefined, mk({})).actual
  assert.deepEqual(alertas.detectarEventos(pre, mk({ estado: 'in' })).eventos.map((e) => e.tipo), ['inicio'])
  const g = alertas.detectarEventos(a0, mk({ estado: 'in', gl: '1', gv: '1', detalles: [gol("12'", 'A', '10'), gol("70'", 'Rivera', '20')] })).eventos[0]
  assert.equal(g.tipo, 'gol')
  assert.equal(g.lado, 'visita')
  assert.equal(g.gol.jugador, 'Rivera')
  assert.equal(alertas.detectarEventos(a0, mk({ estado: 'in', gl: '0', gv: '0' })).eventos[0].tipo, 'anulado')
  assert.equal(alertas.detectarEventos(a0, mk({ estado: 'in', gl: '1', gv: '0', detalles: [{ redCard: true, clock: { displayValue: "60'" }, team: { id: '20' }, athletesInvolved: [{ displayName: 'Gómez' }] }] })).eventos[0].tipo, 'roja')
  assert.equal(alertas.detectarEventos(a0, mk({ estado: 'in', nombreEstado: 'STATUS_HALFTIME', gl: '1' })).eventos[0].tipo, 'descanso')
  assert.equal(alertas.detectarEventos(a0, mk({ estado: 'post', gl: '1' })).eventos[0].tipo, 'final')
  assert.ok(alertas.textoEvento({ tipo: 'final' }, mk({ estado: 'post', gl: '2', gv: '1' })).includes('*2 - 1*'))
})

test('seguir/dejar: límites, repetidos y búsqueda por nombre', () => {
  const jid = 'grupo-futbol@g.us'
  const s = (nombre) => alertas.seguir({ idBot: 'principal', jid, numero: '519', nombre, claves: ['liga1'] })
  assert.equal(s('Alianza Lima').ok, true)
  assert.equal(s('Alianza Lima').motivo, 'repetido')
  for (const n of ['Universitario', 'Sporting Cristal', 'Melgar', 'Cusco FC']) assert.equal(s(n).ok, true)
  assert.equal(s('Binacional').motivo, 'limite')
  assert.equal(alertas.listarDe(jid).length, 5)
  assert.deepEqual(alertas.dejar(jid, 'alianza').map((x) => x.nombre), ['Alianza Lima'])
  assert.deepEqual(alertas.dejar(jid, 'no-existe'), [])
  for (const x of alertas.listarDe(jid)) alertas.dejar(jid, x.nombre)
  assert.equal(alertas.listarDe(jid).length, 0)
})

test('procesar: avisa solo cambios, solo a los seguidores de ese bot, y no repite', async () => {
  const jid = 'grupo-alertas@g.us'
  alertas.seguir({ idBot: 'principal', jid, numero: '519', nombre: 'Alianza Lima', claves: ['liga1'] })
  alertas.seguir({ idBot: '5111', jid: 'otro@g.us', numero: '519', nombre: 'Alianza Lima', claves: ['liga1'] })
  const enviados = []
  const sock = { sendMessage: async (j, c) => { enviados.push([j, desnegrita(c.text)]) } }
  const ahora = Date.now()
  const ronda = async (ev) => {
    const red = simularRed([['per.1/', { events: [ev] }]])
    try { return await alertas.procesar(sock, 'principal', ahora) } finally { red.restaurar() }
  }
  const base = { id: 'p1', fecha: new Date(ahora).toISOString() }
  assert.equal(await ronda(evento({ ...base })), 0) // primera vista: se registra
  assert.equal(await ronda(evento({ ...base, estado: 'in', reloj: "1'" })), 1) // inicio
  assert.equal(await ronda(evento({ ...base, estado: 'in', reloj: "20'", gl: '1', detalles: [gol("20'", 'Hernández', '10')] })), 1) // gol
  assert.equal(await ronda(evento({ ...base, estado: 'in', reloj: "21'", gl: '1', detalles: [gol("20'", 'Hernández', '10')] })), 0) // sin cambios
  assert.equal(await ronda(evento({ ...base, estado: 'post', gl: '1', detalles: [gol("20'", 'Hernández', '10')] })), 1) // final
  assert.ok(enviados.every(([j]) => j === jid)) // el bot 5111 no interviene
  assert.ok(enviados[1][1].includes('Hernández') && enviados[1][1].includes('GOOOL'))
  assert.ok(enviados[2][1].includes('Final'))
  for (const x of [...alertas.listarDe(jid), ...alertas.listarDe('otro@g.us')]) alertas.dejar(x.jid, x.nombre)
})

// ── Comandos ──────────────────────────────────────────────────────────
function crearSock() {
  const enviados = []
  return { enviados, sendMessage: async (j, c) => { if (!c.react) enviados.push(c) } }
}
const msg = { key: { remoteJid: 'g@g.us', participant: '51900000001@s.whatsapp.net' }, message: {} }
const cmd = (n) => require(`../modulos/deportes/${n}`)
const textoDe = (c) => desnegrita(c.text)

test('.marcador sin liga: marcadores de hoy con lista desplegable de ligas', async () => {
  const red = simularRed([['per.1/', { events: [evento({ estado: 'in', reloj: "30'", gl: '1', detalles: [] })] }]])
  const sock = crearSock()
  try { await cmd('marcador').execute(sock, msg, [], { config }) } finally { red.restaurar() }
  const c = sock.enviados[0]
  assert.ok(textoDe(c).includes('Liga 1 Perú') && textoDe(c).includes('*1 - 0*'))
  const filas = c.buttons[0].sections[0].rows
  assert.equal(filas.length, Object.keys(futbol.LIGAS).length)
  assert.ok(filas.every((f) => f.title.length <= 24 && f.id.startsWith(`${config.PREFIXES[0]}marcador `)))
})

test('.marcador con liga válida, sin partidos y con liga inválida', async () => {
  const red = simularRed([['esp.1/', { events: [] }]])
  const sock = crearSock()
  try {
    await cmd('marcador').execute(sock, msg, ['laliga'], { config })
    await cmd('marcador').execute(sock, msg, ['zzz'], { config })
  } finally { red.restaurar() }
  assert.ok(textoDe(sock.enviados[0]).includes('Hoy no hay partidos en LaLiga'))
  assert.ok(sock.enviados[0].buttons.length === 3)
  assert.ok(textoDe(sock.enviados[1]).includes('No conozco la liga'))
})

test('si WhatsApp rechaza listas y botones, el comando manda texto simple', async () => {
  const red = simularRed([['per.1/', { events: [evento()] }]])
  const enviados = []
  const sock = { sendMessage: async (j, c) => { if (c.buttons) throw new Error('no soportado'); enviados.push(c) } }
  const log = console.error; console.error = () => {}
  try { await cmd('marcador').execute(sock, msg, [], { config }) } finally { red.restaurar(); console.error = log }
  assert.ok(enviados[0].text.includes('Alianza Lima'))
})

test('.envivo muestra solo lo que se juega y avisa cuando no hay nada', async () => {
  let red = simularRed([['per.1/', { events: [evento({ id: 'a', estado: 'in', reloj: "10'" }), evento({ id: 'b', local: 'Sporting Cristal', visita: 'Melgar', estado: 'post', gl: '3' })] }]])
  let sock = crearSock()
  try { await cmd('envivo').execute(sock, msg, [], { config }) } finally { red.restaurar() }
  let t = textoDe(sock.enviados[0])
  assert.ok(t.includes('Alianza Lima') && !t.includes('Sporting Cristal') && t.includes('1 partido'))
  // Un partido más tarde HOY (hora de Perú): 1 h adelante, pero sin pasar de la medianoche.
  const finDeHoy = Math.ceil((Date.now() - 5 * 3600000 + 1) / 86400000) * 86400000 + 5 * 3600000
  red = simularRed([['per.1/', { events: [evento({ estado: 'pre', fecha: new Date(Math.min(Date.now() + 3600000, finDeHoy - 1000)).toISOString() })] }]])
  sock = crearSock()
  try { await cmd('envivo').execute(sock, msg, [], { config }) } finally { red.restaurar() }
  t = textoDe(sock.enviados[0])
  assert.ok(t.includes('no hay partidos en juego') && t.includes('Más tarde hoy'))
})

test('.tablaliga, .fixture, .infopartido y .ligas responden', async () => {
  const entry = { team: { displayName: 'Primero FC' }, stats: [{ name: 'rank', value: 1 }, { name: 'points', value: 30 }] }
  const futuro = new Date(Date.now() + 86400000).toISOString()
  const red = simularRed([
    ['standings', { children: [{ standings: { entries: [entry] } }] }],
    ['per.1/', { events: [evento({ fecha: futuro, estado: 'pre' })] }],
  ])
  const sock = crearSock()
  const log = console.error; console.error = () => {}
  try {
    await cmd('tablaliga').execute(sock, msg, ['liga1'], { config })
    await cmd('tablaliga').execute(sock, msg, [], { config })
    await cmd('fixture').execute(sock, msg, ['liga1'], { config })
    await cmd('fixture').execute(sock, msg, ['alianza'], { config })
    await cmd('infopartido').execute(sock, msg, ['alianza'], { config })
    await cmd('infopartido').execute(sock, msg, [], { config })
    await cmd('ligas').execute(sock, msg, [], { config })
  } finally { red.restaurar(); console.error = log }
  const t = sock.enviados.map(textoDe)
  assert.ok(t[0].includes('Primero FC'))
  assert.ok(t[1].includes('Elige una liga'))
  assert.ok(t[2].includes('Alianza Lima vs Universitario'))
  assert.ok(sock.enviados[3].buttons.some((b) => b.id.includes('seguirequipo')))
  assert.ok(t[4].includes('Estadio Alejandro Villanueva'))
  assert.ok(t[5].includes('Escribe el equipo'))
  assert.ok(t[6].includes('Liga 1 Perú'))
})

test('.seguirequipo, .misequipos y .dejarequipo de punta a punta', async () => {
  const red = simularRed([['per.1/', { events: [evento({ fecha: new Date(Date.now() + 7200000).toISOString() })] }]])
  const sock = crearSock()
  const m = { key: { remoteJid: 'chat-seguir@g.us', participant: '51900000009@s.whatsapp.net' }, message: {} }
  try {
    await cmd('seguirequipo').execute(sock, m, [], { config })
    await cmd('seguirequipo').execute(sock, m, ['alianza'], { config, esSubBot: true, subbotNumero: '5999' })
    await cmd('seguirequipo').execute(sock, m, ['alianza'], { config, esSubBot: true, subbotNumero: '5999' })
    await cmd('seguirequipo').execute(sock, m, ['inexistentefc'], { config })
    await cmd('misequipos').execute(sock, m, [], { config })
    await cmd('dejarequipo').execute(sock, m, ['alianza'], { config })
    await cmd('misequipos').execute(sock, m, [], { config })
  } finally { red.restaurar() }
  const t = sock.enviados.map(textoDe)
  assert.ok(t[0].includes('Escribe'))
  assert.ok(t[1].includes('Siguiendo equipo') || t[1].includes('SIGUIENDO EQUIPO'))
  assert.equal(alertas.listarDe('chat-seguir@g.us').length, 0)
  assert.ok(t[2].includes('Ya sigues'))
  assert.ok(t[3].includes('No encontré partidos'))
  assert.ok(t[4].includes('Alianza Lima'))
  assert.ok(t[5].includes('Dejaste de seguir'))
  assert.ok(t[6].includes('no sigue a ningún'))
})

// ── Ver una vez ───────────────────────────────────────────────────────
const vista = require('../lib/verUnaVez')
const citar = (quotedMessage) => ({ key: { remoteJid: 'g@g.us', participant: '51900000001@s.whatsapp.net' }, message: { extendedTextMessage: { text: '.vv', contextInfo: { quotedMessage } } } })

test('extraerMedia reconoce las envolturas de "ver una vez"', () => {
  const img = { imageMessage: { caption: 'hola', viewOnce: true } }
  for (const envuelto of [{ viewOnceMessage: { message: img } }, { viewOnceMessageV2: { message: img } }, { viewOnceMessageV2Extension: { message: { audioMessage: { ptt: true } } } }]) {
    const m = vista.extraerMedia(citar(envuelto))
    assert.ok(m && m.vistaUnica)
  }
  assert.equal(vista.extraerMedia(citar(img)).vistaUnica, true) // bandera viewOnce dentro del mensaje
  assert.equal(vista.extraerMedia(citar({ imageMessage: { caption: 'normal' } })).vistaUnica, false)
  assert.equal(vista.extraerMedia(citar({ conversation: 'texto' })), null)
  assert.equal(vista.extraerMedia({ key: {}, message: { conversation: '.vv' } }), null)
  assert.equal(vista.extraerMedia(citar({ viewOnceMessage: { message: { videoMessage: {} } } })).tipo, 'video')
})

test('aContenido arma imagen, video y audio', () => {
  const buf = Buffer.from('x')
  assert.deepEqual(vista.aContenido({ tipo: 'image', mensaje: { caption: 'c' } }, buf, 'P'), { image: buf, caption: 'P\nc' })
  assert.equal(vista.aContenido({ tipo: 'video', mensaje: { gifPlayback: true } }, buf, 'P').gifPlayback, true)
  const a = vista.aContenido({ tipo: 'audio', mensaje: { ptt: true } }, buf, 'P')
  assert.ok(a.ptt && a.mimetype.startsWith('audio/'))
})

test('descargar junta los trozos y falla si viene vacío', async () => {
  const bajar = async function* () { yield Buffer.from('ab'); yield Buffer.from('cd') }
  assert.equal((await vista.descargar({ tipo: 'image', mensaje: {} }, async () => bajar())).toString(), 'abcd')
  await assert.rejects(vista.descargar({ tipo: 'image', mensaje: {} }, async () => (async function* () {})()), /ya no está disponible/)
})

test('.vv usa el "ver una vez" guardado cuando la cita viene sin clave, y lo explica si no lo tiene', async () => {
  vista._guardados.clear()
  const clave = Buffer.from('clave')
  const original = { key: { remoteJid: 'g@g.us', id: 'ORIG1' }, message: { viewOnceMessageV2: { message: { imageMessage: { caption: 'foto', mediaKey: clave, viewOnce: true } } } } }
  assert.equal(vista.guardar(original), true)
  assert.equal(vista.guardar({ key: { remoteJid: 'g@g.us', id: 'N1' }, message: { imageMessage: { mediaKey: clave } } }), false, 'una foto normal no se guarda')
  assert.equal(vista.guardar({ key: { remoteJid: 'g@g.us', id: 'N2' }, message: { viewOnceMessage: { message: { imageMessage: {} } } } }), false, 'sin clave no sirve')

  const respuesta = (id) => ({ ...citar({ viewOnceMessage: { message: { imageMessage: { caption: 'foto' } } } }), })
  const conId = (id) => { const m = respuesta(); m.message.extendedTextMessage.contextInfo.stanzaId = id; return m }
  const media = vista.extraerMedia(conId('ORIG1'))
  assert.ok(!media.sinClave && media.mensaje.mediaKey === clave, 'toma la copia guardada')
  assert.equal(vista.extraerMedia(conId('OTRO')).sinClave, true)

  const comando = require('../modulos/media/verunavez')
  const antes = vista.descargar
  vista.descargar = async () => Buffer.from('foto')
  try {
    const sock = crearSock()
    await comando.execute(sock, conId('ORIG1'), ['aqui'], { config })
    assert.ok(Buffer.isBuffer(sock.enviados[0].image))
    const sock2 = crearSock()
    await comando.execute(sock2, conId('OTRO'), [], { config })
    assert.ok(desnegrita(sock2.enviados[0].text).includes('no estaba conectado'))
  } finally { vista.descargar = antes }
})

test('.verunavez revela en el chat, por privado, o explica qué hacer', async () => {
  const comando = require('../modulos/media/verunavez')
  const original = vista.descargar
  vista.descargar = async () => Buffer.from('foto')
  try {
    // Por defecto, en un grupo va al privado de quien lo pidió sin avisar en el chat
    const sock2 = crearSock()
    const destinos = []
    sock2.sendMessage = async (j, c) => { if (!c.react) destinos.push([j, c]) }
    await comando.execute(sock2, citar({ viewOnceMessage: { message: { audioMessage: { ptt: true, mediaKey: Buffer.from('k') } } } }), [], { config })
    assert.equal(destinos[0][0], '51900000001@s.whatsapp.net')
    assert.equal(destinos.length, 1) // sin aviso en el chat

    // Con LID: usa el teléfono real (participantAlt), no el número del LID
    const sockLid = crearSock()
    const dLid = []
    sockLid.sendMessage = async (j, c) => { if (!c.react) dLid.push(j) }
    const msgLid = citar({ viewOnceMessage: { message: { imageMessage: { mediaKey: Buffer.from('k') } } } })
    msgLid.key.participant = '279882198204437@lid'; msgLid.key.participantAlt = '51911111111@s.whatsapp.net'
    await comando.execute(sockLid, msgLid, [], { config })
    assert.equal(dLid[0], '51911111111@s.whatsapp.net')

    // Con "aqui" se muestra en el mismo chat
    const sock = crearSock()
    await comando.execute(sock, citar({ viewOnceMessage: { message: { imageMessage: { caption: 'secreto', mediaKey: Buffer.from('k') } } } }), ['aqui'], { config })
    assert.ok(Buffer.isBuffer(sock.enviados[0].image) && sock.enviados[0].caption.includes('Revelado'))

    const sock3 = crearSock()
    await comando.execute(sock3, { key: { remoteJid: 'g@g.us' }, message: { conversation: '.vv' } }, [], { config })
    assert.ok(desnegrita(sock3.enviados[0].text).includes('Responde a una foto'))
    await comando.execute(sock3, citar({ imageMessage: { caption: 'normal' } }), [], { config })
    assert.ok(sock3.enviados[1].text.includes('no es de "ver una vez"'))

    vista.descargar = async () => { throw new Error('sin archivo') }
    const log = console.error; console.error = () => {}
    try { await comando.execute(sock3, citar({ viewOnceMessage: { message: { imageMessage: { mediaKey: Buffer.from('k') } } } }), [], { config }) } finally { console.error = log }
    assert.ok(sock3.enviados[2].text.includes('No pude revelarlo'))
  } finally { vista.descargar = original }
})
