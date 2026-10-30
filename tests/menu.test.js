// Menú: visibilidad por permisos, búsqueda, paginado y respaldos de envío.
const test = require('node:test')
const assert = require('node:assert/strict')

const menu = require('../modulos/main/menu')
const config = require('../defaults')

const { negrita, normalizar, partirBloques, resolverCategoria, distancia } = menu._internos
const OWNER = config.OWNERS[0].numero
const P = config.PREFIXES[0]
const GRUPO = '120363000@g.us'
const DESCONOCIDO = '51999888777'

function cmd(name, category, extra = {}) {
  return { name, category, aliases: [], description: `Descripción de ${name}`, ...extra }
}

function crearCategorias(lista) {
  const categories = new Map()
  for (const c of lista) {
    if (!categories.has(c.category)) categories.set(c.category, [])
    categories.get(c.category).push(c)
  }
  return categories
}

const COMANDOS = [
  cmd('menu', 'main', { aliases: ['ayuda'] }),
  cmd('ping', 'main'),
  cmd('kick', 'grupo', { aliases: ['expulsar'] }),
  cmd('sticker', 'media', { aliases: ['s'] }),
  cmd('eval', 'owner', { ownerOnly: true }),
  cmd('setprefix', 'subbot', { subbotOwnerOnly: true }),
]

function crearSock() {
  const enviados = []
  return {
    enviados,
    user: { id: '51000000000:1@s.whatsapp.net' },
    async sendMessage(jid, contenido, opciones) {
      enviados.push({ jid, contenido, opciones })
    },
  }
}

function mensaje(numero, jid = GRUPO) {
  return { key: { remoteJid: jid, participant: `${numero}@s.whatsapp.net`, fromMe: false }, pushName: 'Tester' }
}

async function ejecutar(args, numero = DESCONOCIDO, sock = crearSock(), configExtra = {}) {
  const categories = crearCategorias(COMANDOS)
  const commands = new Map(COMANDOS.map((c) => [c.name, c]))
  await menu.execute(sock, mensaje(numero), args, {
    categories,
    commands,
    config: { ...config, ...configExtra },
    esSubBot: false,
    subbotNumero: null,
  })
  return sock.enviados
}

const textoDe = (envio) => envio.contenido.text || envio.contenido.caption || ''

test('negrita convierte ASCII y respeta acentos y símbolos', () => {
  assert.equal(negrita('Hola 1'), '𝗛𝗼𝗹𝗮 𝟭')
  assert.equal(negrita('é!'), 'é!')
})

test('normalizar quita acentos y mayúsculas', () => {
  assert.equal(normalizar('  DIVERSIÓN '), 'diversion')
})

test('resolverCategoria entiende alias', () => {
  assert.equal(resolverCategoria('Juegos'), 'diversion')
  assert.equal(resolverCategoria('descargas'), 'download')
  assert.equal(resolverCategoria('admin'), 'grupo')
  assert.equal(resolverCategoria('nada'), null)
})

test('distancia calcula ediciones', () => {
  assert.equal(distancia('kick', 'kick'), 0)
  assert.equal(distancia('kik', 'kick'), 1)
})

test('partirBloques no supera el límite ni parte un bloque', () => {
  const bloques = Array.from({ length: 20 }, (_, i) => `bloque-${i}-${'x'.repeat(100)}\n`)
  const partes = partirBloques(bloques, 500)
  assert.ok(partes.length > 1)
  for (const p of partes) assert.ok(p.length <= 500)
  assert.equal(partes.join('').replace(/\s/g, '').length, bloques.join('').replace(/\s/g, '').length)
})

const clásico = { MENU_IMAGES: [], MENU_BOTONES: false, MENU_LISTA: false }
const filasDe = (envio) => envio.contenido.buttons[0].sections.flatMap((sec) => sec.rows)
const titulosDe = (envio) => envio.contenido.buttons[0].sections.map((sec) => sec.title).join('|')

test('portada clásica: oculta comandos de owner a usuarios normales', async () => {
  const [envio] = await ejecutar([], DESCONOCIDO, crearSock(), clásico)
  const t = textoDe(envio)
  assert.ok(t.includes('GRUPO'))
  assert.ok(!t.includes('OWNER'))
  assert.ok(!t.includes('SUBBOTS'))
})

test('portada clásica: muestra owner al owner', async () => {
  const [envio] = await ejecutar([], OWNER, crearSock(), clásico)
  assert.ok(textoDe(envio).includes('OWNER'))
})

test('portada en UN mensaje con lista desplegable con todos los comandos', async () => {
  const envios = await ejecutar([], DESCONOCIDO, crearSock(), { MENU_IMAGES: [] })
  assert.equal(envios.length, 1)
  const btn = envios[0].contenido.buttons[0]
  assert.ok(btn.text && Array.isArray(btn.sections))
  const ids = filasDe(envios[0]).map((r) => r.id).filter((id) => !id.includes(' ')) // sin los accesos rápidos (".menu novedades"…)
  assert.deepEqual(ids.sort(), [P + 'kick', P + 'menu', P + 'ping', P + 'sticker'].sort())
  for (const sec of btn.sections) assert.ok(sec.title.length <= 24)
  for (const fila of filasDe(envios[0])) assert.ok(fila.title.length <= 24 && fila.description.length <= 72)
})

test('la lista oculta owner a usuarios normales y lo muestra al owner', async () => {
  const [normal] = await ejecutar([], DESCONOCIDO, crearSock(), { MENU_IMAGES: [] })
  assert.ok(!titulosDe(normal).includes('OWNER'))
  assert.ok(!filasDe(normal).some((r) => r.id === P + 'eval'))
  const [owner] = await ejecutar([], OWNER, crearSock(), { MENU_IMAGES: [] })
  assert.ok(filasDe(owner).some((r) => r.id === P + 'eval'))
})

test('si la lista falla, cae a botones rápidos y luego a texto', async () => {
  const sock = crearSock()
  const original = sock.sendMessage.bind(sock)
  sock.sendMessage = async (jid, contenido, op) => {
    if (contenido.buttons) throw new Error('sin botones')
    return original(jid, contenido, op)
  }
  const envios = await ejecutar([], DESCONOCIDO, sock, { MENU_IMAGES: [] })
  assert.equal(envios.length, 1)
  assert.ok(!envios[0].contenido.buttons)
  assert.ok(textoDe(envios[0]).includes(negrita('CATEGORÍAS')))
})

test('.menu <categoría> lista sus comandos', async () => {
  const [envio] = await ejecutar(['grupo'])
  const t = textoDe(envio)
  assert.ok(t.includes(P + 'kick'))
  assert.ok(!t.includes(P + 'ping'))
})

test('.menu owner está bloqueado para usuarios normales', async () => {
  const [envio] = await ejecutar(['owner'])
  const t = textoDe(envio)
  assert.ok(t.includes('No tienes acceso'))
  assert.ok(!t.includes(P + 'eval'))
})

test('.menu <comando> da la ficha, también por alias', async () => {
  const [envio] = await ejecutar(['expulsar'])
  const t = textoDe(envio)
  assert.ok(t.includes(negrita('Alias')))
  assert.ok(t.includes(P + 'expulsar'))
})

test('buscar no revela comandos de owner', async () => {
  const [envio] = await ejecutar(['eval'])
  assert.ok(textoDe(envio).includes('No encontré'))
})

test('sugiere comandos parecidos', async () => {
  const [envio] = await ejecutar(['kik'])
  assert.ok(textoDe(envio).includes(P + 'kick'))
})

test('.menu todo devuelve la lista completa visible', async () => {
  const envios = await ejecutar(['todo'])
  const t = envios.map(textoDe).join('\n')
  assert.ok(t.includes(P + 'ping') && t.includes(P + 'sticker'))
  assert.ok(!t.includes(P + 'eval'))
})

test('con MENU_LISTA desactivado usa botones rápidos con el prefijo', async () => {
  const [envio] = await ejecutar([], DESCONOCIDO, crearSock(), { MENU_IMAGES: [], MENU_LISTA: false, MENU_BOTONES: true })
  assert.ok(envio.contenido.buttons.length <= 3)
  assert.ok(envio.contenido.buttons.every((b) => b.buttonId.startsWith(P + 'menu')))
})


// ── Menú plus ─────────────────────────────────────────────────────────
const fs = require('fs')
const path = require('path')
const plus = require('../lib/menuPlus')

const filasTodas = (envio) => envio.contenido.buttons[0].sections.flatMap((sec) => sec.rows)
const sinRepetidos = (ids) => assert.equal(new Set(ids).size, ids.length, `ids repetidos: ${ids}`)

test('la lista de la portada trae accesos rápidos, sin ids repetidos y dentro de los límites', async () => {
  const [envio] = await ejecutar([], DESCONOCIDO, crearSock(), { MENU_IMAGES: [] })
  const secciones = envio.contenido.buttons[0].sections
  assert.ok(secciones[0].title.includes('Accesos rápidos'))
  const idsRapidos = secciones[0].rows.map((r) => r.id)
  for (const sub of ['categorias', 'azar', 'consejo', 'buscar', 'todo']) assert.ok(idsRapidos.includes(`${P}menu ${sub}`), sub)
  sinRepetidos(filasTodas(envio).map((r) => r.id))
  for (const sec of secciones) { assert.ok(sec.title.length <= 24); for (const f of sec.rows) assert.ok(f.title.length <= 24 && f.description.length <= 72, f.title) }
})

test('la portada muestra tu perfil con barra de XP, racha y logros', async () => {
  const db = require('../lib/db')
  const respaldo = db.obtenerUsuario
  // la portada lee el usuario real: se simula con un usuario temporal
  const { respaldar } = require('./_util')
  const restaurarDatos = respaldar([path.join(__dirname, '..', 'data', 'usuarios.json')])
  try {
    db.guardarUsuario('51999000111', { xp: 450, nivel: 2, monedas: 120, racha: 3 })
    const sock = crearSock()
    const msgPerfil = { key: { remoteJid: GRUPO, participant: '51999000111@s.whatsapp.net' }, pushName: 'Luz' }
    await menu.execute(sock, msgPerfil, [], { categories: crearCategorias(COMANDOS), commands: new Map(COMANDOS.map((c) => [c.name, c])), config: { ...config, MENU_IMAGES: [] }, esSubBot: false })
    const t = textoDe(sock.enviados[0])
    assert.ok(t.includes('▰') && t.includes('50/500'), t)
    assert.ok(t.includes('Racha *3* días') && /🏆 \*\d+\/\d+\*/.test(t), t)
    assert.ok(t.includes('💡'), 'consejo del día')
  } finally { restaurarDatos(); void respaldo }
})

test('.menu <categoría> trae lista para tocar y navegación a las vecinas', async () => {
  const [envio] = await ejecutar(['grupo'])
  assert.ok(envio.contenido.buttons, 'lista en la última página')
  const secciones = envio.contenido.buttons[0].sections
  assert.ok(secciones[0].rows.some((r) => r.id === P + 'kick'))
  const nav = secciones.find((s) => s.title.includes('Navegar'))
  assert.ok(nav.rows.some((r) => r.id === `${P}menu portada`))
  assert.ok(nav.rows.some((r) => r.id.startsWith(`${P}menu `) && r.title.includes('➡️')))
  sinRepetidos(secciones.flatMap((s) => s.rows).map((r) => r.id))
})

test('si la lista falla en una categoría, cae a texto', async () => {
  const sock = crearSock()
  const original = sock.sendMessage.bind(sock)
  sock.sendMessage = async (j, c, o) => { if (c.buttons) throw new Error('no'); return original(j, c, o) }
  const envios = await ejecutar(['grupo'], DESCONOCIDO, sock)
  assert.ok(textoDe(envios[0]).includes(P + 'kick') && !envios[0].contenido.buttons)
})

test('la ficha de un comando trae cómo se usa, comandos parecidos y botones', async () => {
  const comandos = [cmd('descargar', 'main', { description: `Baja cosas: ${P}descargar <enlace> [audio]`, aliases: ['bajar'] }), cmd('ping', 'main'), cmd('menu', 'main')]
  const sock = crearSock()
  await menu.execute(sock, mensaje(DESCONOCIDO), ['bajar'], { categories: crearCategorias(comandos), commands: new Map(comandos.map((c) => [c.name, c])), config: { ...config }, esSubBot: false })
  const t = textoDe(sock.enviados[0])
  assert.ok(t.includes(`${P}descargar <enlace> [audio]`), 'uso sacado de la descripción')
  assert.ok(t.includes(negrita('Del mismo grupo')) && t.includes(P + 'ping'))
  const botones = sock.enviados[0].contenido.buttons
  assert.ok(botones.some((b) => b.id === `${P}menu azar`) && botones.some((b) => b.id === `${P}menu`))
})

test('subcomandos: categorias, azar, consejo, buscar, novedades y populares', async () => {
  const [cats] = await ejecutar(['categorias'])
  assert.ok(textoDe(cats).includes('GRUPO') && !textoDe(cats).includes('OWNER'))
  assert.ok(cats.contenido.buttons[0].sections[0].rows.every((r) => r.id.startsWith(`${P}menu `)))

  const [azar] = await ejecutar(['azar'])
  assert.ok(textoDe(azar).includes('sorpresa'))
  for (let i = 0; i < 20; i++) { const [a] = await ejecutar(['azar']); assert.ok(!textoDe(a).includes('eval'), 'el azar no revela comandos de owner') }

  const [consejo] = await ejecutar(['consejo'])
  assert.ok(sinNegritaT(textoDe(consejo)).includes('CONSEJO') && consejo.contenido.buttons.some((b) => b.id === `${P}menu consejo`))

  const [buscarAyuda] = await ejecutar(['buscar'])
  assert.ok(textoDe(buscarAyuda).includes(`${P}menu sticker`))

  const [nuevos] = await ejecutar(['novedades'])
  assert.ok(textoDe(nuevos).includes('Aún no hay novedades'), 'con comandos de prueba no hay novedades')

  const [pop] = await ejecutar(['populares'])
  assert.ok(/estadísticas|MÁS USADOS|MÁS USADOS/i.test(sinNegritaT(textoDe(pop))))
})

function sinNegritaT(t) {
  return Array.from(String(t), (ch) => {
    const c = ch.codePointAt(0)
    if (c >= 0x1d5d4 && c <= 0x1d5ed) return String.fromCharCode(65 + c - 0x1d5d4)
    if (c >= 0x1d5ee && c <= 0x1d607) return String.fromCharCode(97 + c - 0x1d5ee)
    return ch
  }).join('')
}

test('novedades muestra solo comandos que existen y puedes usar', async () => {
  const comandos = [cmd('dl', 'download'), cmd('autolink', 'download'), cmd('eval', 'owner', { ownerOnly: true }), cmd('menu', 'main')]
  const sock = crearSock()
  await menu.execute(sock, mensaje(DESCONOCIDO), ['nuevo'], { categories: crearCategorias(comandos), commands: new Map(comandos.map((c) => [c.name, c])), config: { ...config }, esSubBot: false })
  const t = textoDe(sock.enviados[0])
  assert.ok(t.includes(P + 'dl') && t.includes(P + 'autolink'))
  assert.deepEqual(sock.enviados[0].contenido.buttons[0].sections[0].rows.map((r) => r.id), [P + 'dl', P + 'autolink'])
})

test('buscar con varios resultados ofrece una lista para tocar', async () => {
  const comandos = [cmd('sticker', 'media'), cmd('stickerly', 'media'), cmd('menu', 'main')]
  const sock = crearSock()
  await menu.execute(sock, mensaje(DESCONOCIDO), ['stick'], { categories: crearCategorias(comandos), commands: new Map(comandos.map((c) => [c.name, c])), config: { ...config }, esSubBot: false })
  assert.deepEqual(sock.enviados[0].contenido.buttons[0].sections[0].rows.map((r) => r.id).sort(), [P + 'sticker', P + 'stickerly'])
})

test('resolverSubcomando y la palabra "inicio"', () => {
  const { resolverSubcomando } = menu._internos
  assert.equal(resolverSubcomando('Más usados'), 'populares')
  assert.equal(resolverSubcomando('NOVEDADES'), 'novedades')
  assert.equal(resolverSubcomando('inicio'), 'portada')
  assert.equal(resolverSubcomando('grupo'), null)
  assert.equal(resolverSubcomando('top'), null) // .top sigue siendo el comando del ranking
})

test('menuPlus: barra de XP, uso extraído y consejos', () => {
  assert.deepEqual(plus.barraXp(0, 1), { barra: '▱▱▱▱▱▱▱▱▱▱', actual: 0, span: 300, pct: 0 })
  assert.equal(plus.barraXp(100 + 150, 1).barra, '▰▰▰▰▰▱▱▱▱▱')
  assert.equal(plus.barraXp(999999, 1).barra, '▰'.repeat(10))
  assert.equal(plus.extraerUso({ name: 'dl', aliases: ['bajarlink'], description: 'Descarga: .dl <enlace> [audio]' }, '!'), '!dl <enlace> [audio]')
  assert.equal(plus.extraerUso({ name: 'ping', aliases: [], description: 'Mide la latencia' }, '.'), '.ping')
  assert.ok(!plus.tipDelDia('!').includes('{P}'))
  assert.ok(plus.TIPS.filter((t) => t.includes('{P}')).every((t) => t.replace(/\{P\}/g, '!').includes('!') && !t.replace(/\{P\}/g, '!').includes('{P}')))
  assert.equal(plus.tipDelDia('.', 0), plus.tipDelDia('.', 1000)) // mismo día, mismo consejo
  for (const t of plus.TIPS) assert.ok(t.length < 170, t)
  assert.notEqual(plus.tipAlAzar('.', plus.tipAlAzar('.')), undefined)
})

test('cada comando de NOVEDADES existe de verdad y los consejos nombran comandos reales', () => {
  const nombres = new Set()
  const recorrer = (d) => { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const r = path.join(d, e.name); if (e.isDirectory()) recorrer(r); else if (e.name.endsWith('.js')) { const m = fs.readFileSync(r, 'utf8').match(/name:\s*'([^']+)'/g) || []; m.forEach((x) => nombres.add(x.match(/'([^']+)'/)[1])); nombres.add(e.name.replace(/\.js$/, '')) } } }
  recorrer(path.join(__dirname, '..', 'modulos'))
  for (const n of plus.NOVEDADES) assert.ok(nombres.has(n), `no existe .${n}`)
  const aliases = new Set()
  const recorrerAlias = (d) => { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const r = path.join(d, e.name); if (e.isDirectory()) recorrerAlias(r); else if (e.name.endsWith('.js')) for (const l of fs.readFileSync(r, 'utf8').matchAll(/aliases:\s*\[([^\]]*)\]/g)) for (const a of l[1].matchAll(/'([^']+)'/g)) aliases.add(a[1]) } }
  recorrerAlias(path.join(__dirname, '..', 'modulos'))
  for (const tip of plus.TIPS) for (const m of tip.matchAll(/\*\{P\}([a-záéíóúñ0-9]+)/gi)) assert.ok(nombres.has(m[1]) || aliases.has(m[1]), `el consejo menciona .${m[1]} que no existe`)
})

test('si la conexión está caída no se reintentan otros formatos (portada y categorías)', async () => {
  const caida = () => { const e = new Error('Connection Closed'); e.output = { statusCode: 428 }; return e }
  for (const args of [[], ['grupo']]) {
    const sock = crearSock()
    let intentos = 0
    sock.sendMessage = async () => { intentos++; throw caida() }
    const log = console.error; console.error = () => {}
    try { await assert.rejects(ejecutar(args, DESCONOCIDO, sock, { MENU_IMAGES: [] }), /Connection Closed/) } finally { console.error = log }
    assert.equal(intentos, 1, 'un solo intento')
  }
})
