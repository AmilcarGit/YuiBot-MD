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
  const ids = filasDe(envios[0]).map((r) => r.id)
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
