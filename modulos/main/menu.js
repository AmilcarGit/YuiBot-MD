// Menú Plus - YuiBot-MD
//
//   .menu                → portada: tu perfil, estado del bot y el índice de categorías
//                          (con imagen/gif y botones de acceso rápido)
//   .menu <categoría>    → comandos de esa categoría (ej: .menu grupo, .menu juegos)
//   .menu <palabra>      → busca comandos por nombre, alias o descripción (ej: .menu sticker)
//   .menu <comando>      → ficha de un comando (alias, permisos, ejemplo)
//   .menu novedades     → lo último que se agregó (también populares, categorias, azar, consejo)
//   .menu todo           → la lista completa, repartida en varios mensajes
//
// Solo se muestran los comandos que quien lo pide puede usar (los de owner no
// aparecen para el resto), y los mensajes largos se parten para no pasarse del
// límite de WhatsApp.

const fs = require('fs')
const { evaluarPermiso } = require('../../lib/permisos')
const { obtenerUsuario, calcularNivel } = require('../../lib/db')
const { obtenerRangoPorNivel } = require('../../lib/roles')
const { enviarConRespaldo, esConexionCerrada } = require('../../lib/whatsapp/interactivos')
const { progreso: progresoLogros } = require('../../lib/logros')
const { usosPorComando } = require('../../lib/estadisticas')
const { NOVEDADES, tipDelDia, tipAlAzar, barraXp, extraerUso } = require('../../lib/menuPlus')

const LIMITE_MENSAJE = 3400 // caracteres por mensaje (WhatsApp admite más, pero así se lee mejor)
const MAX_RESULTADOS = 15

const ORDEN_CATEGORIAS = [
  'main', 'usuario', 'grupo', 'diversion', 'deportes', 'rpg', 'download', 'media', 'imagenes',
  'utilidad', 'herramientas', 'audio', 'ia', 'escuela', 'sistema', 'subbot', 'owner',
]

const CATEGORIAS = {
  main:         { emoji: '🌸', titulo: 'PRINCIPAL',    descripcion: 'Lo esencial del bot',                       alias: ['principal', 'inicio'] },
  usuario:      { emoji: '👤', titulo: 'USUARIO',      descripcion: 'Tu perfil y registro',                      alias: ['cuenta', 'usuarios'] },
  grupo:        { emoji: '🛡️', titulo: 'GRUPO',        descripcion: 'Moderación y administración de grupos',     alias: ['grupos', 'admin', 'moderacion'] },
  diversion:    { emoji: '🎮', titulo: 'DIVERSIÓN',    descripcion: 'Juegos, apuestas y economía',               alias: ['juegos', 'economia', 'games', 'fun'] },
  deportes:     { emoji: '⚽', titulo: 'DEPORTES',     descripcion: 'Fútbol en vivo, tablas y alertas de goles', alias: ['futbol', 'sports', 'deporte'] },
  rpg:          { emoji: '⚔️', titulo: 'RPG',          descripcion: 'Aventura: duelos, jefes y misiones',        alias: ['aventura'] },
  download:     { emoji: '📥', titulo: 'DESCARGAS',    descripcion: 'Redes, archivos y páginas: TikTok, X, MediaFire…', alias: ['descargas', 'descargar'] },
  media:        { emoji: '🎨', titulo: 'MULTIMEDIA',   descripcion: 'Stickers y búsqueda de imágenes',           alias: ['multimedia', 'stickers'] },
  imagenes:     { emoji: '🖼️', titulo: 'IMÁGENES',     descripcion: 'Crea imágenes y memes con texto o avatares', alias: ['imagen', 'memes'] },
  utilidad:     { emoji: '🛠️', titulo: 'UTILIDADES',   descripcion: 'Clima, traductor, divisas, OCR, QR y voz',   alias: ['utilidades', 'util', 'utils'] },
  herramientas: { emoji: '🧪', titulo: 'HERRAMIENTAS', descripcion: 'Para desarrolladores: DNS, hash, JSON…',    alias: ['dev', 'tools', 'developer'] },
  audio:        { emoji: '🎧', titulo: 'AUDIO',        descripcion: 'Edita y analiza audios',                    alias: ['audios'] },
  ia:           { emoji: '🤖', titulo: 'IA',           descripcion: 'Conversa con Yui',                          alias: ['yui', 'ai'] },
  escuela:      { emoji: '📚', titulo: 'ESCUELA',      descripcion: 'Tareas, horario, notas y exámenes',                alias: ['school'] },
  sistema:      { emoji: '📊', titulo: 'SISTEMA',      descripcion: 'Estado, estadísticas y soporte',            alias: ['system', 'soporte'] },
  subbot:       { emoji: '🔗', titulo: 'SUBBOTS',      descripcion: 'Crea y administra tu propio bot',           alias: ['subbots', 'sub'] },
  owner:        { emoji: '👑', titulo: 'OWNER',        descripcion: 'Solo para los dueños del bot',              alias: ['owners', 'dueno'] },
}

const FRASES = [
  '✨ ¡Hoy es un gran día para usar el bot!',
  '🚀 Listo para ayudarte en lo que necesites',
  '💫 Que tengas un excelente día',
  '🌸 Disfruta de todas las funciones',
  '⚡ Potencia máxima activada',
  '💎 Calidad premium para ti',
  '🌟 Brilla con cada comando',
  '🎯 Todo listo para ti',
  '🌈 Que tu día sea increíble',
  '🦋 Siente la magia de YuiBot',
  '🎁 Un regalo de funciones para ti',
  '🪐 Explora todo lo que puedo hacer',
  '💖 Hecho con cariño para ti',
  '🌺 Florece con cada comando',
  '🧿 Protección y estilo activados',
]

// ───────────────────────── utilidades de texto ─────────────────────────

const { negrita } = require('../../lib/estilo')

function normalizar(texto) {
  return String(texto || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim()
}

function recortar(texto, max = 90) {
  const limpio = String(texto || '').replace(/\s+/g, ' ').trim()
  return limpio.length > max ? limpio.slice(0, max - 1).trimEnd() + '…' : limpio
}

/** Distancia de edición (para sugerir "¿quisiste decir…?"). */
function distancia(a, b) {
  if (a === b) return 0
  const fila = Array.from({ length: b.length + 1 }, (_, i) => i)
  for (let i = 1; i <= a.length; i++) {
    let anterior = fila[0]
    fila[0] = i
    for (let j = 1; j <= b.length; j++) {
      const temporal = fila[j]
      fila[j] = Math.min(fila[j] + 1, fila[j - 1] + 1, anterior + (a[i - 1] === b[j - 1] ? 0 : 1))
      anterior = temporal
    }
  }
  return fila[b.length]
}

/** Agrupa bloques de texto en mensajes de hasta `max` caracteres, sin partir un bloque. */
function partirBloques(bloques, max = LIMITE_MENSAJE) {
  const partes = []
  let actual = ''
  for (const bloque of bloques) {
    if (actual && actual.length + bloque.length > max) {
      partes.push(actual.trimEnd())
      actual = ''
    }
    actual += bloque
  }
  if (actual.trim()) partes.push(actual.trimEnd())
  return partes
}

function obtenerHoraPeru() {
  const ahora = new Date()
  const hora = ahora.toLocaleTimeString('es-PE', { timeZone: 'America/Lima', hour: '2-digit', minute: '2-digit', hour12: true })
  const fecha = ahora.toLocaleDateString('es-PE', { timeZone: 'America/Lima', weekday: 'long', day: 'numeric', month: 'long' })
  return { hora, fecha: fecha.charAt(0).toUpperCase() + fecha.slice(1) }
}

function obtenerSaludo() {
  const h = parseInt(new Date().toLocaleString('en-US', { timeZone: 'America/Lima', hour: 'numeric', hour12: false }), 10)
  if (h >= 5 && h < 12) return `☀️ ${negrita('Buenos días')}`
  if (h >= 12 && h < 19) return `🌤️ ${negrita('Buenas tardes')}`
  return `🌙 ${negrita('Buenas noches')}`
}

function obtenerUptime() {
  const segundos = process.uptime()
  const d = Math.floor(segundos / 86400)
  const h = Math.floor((segundos % 86400) / 3600)
  const m = Math.floor((segundos % 3600) / 60)
  const partes = []
  if (d) partes.push(`${d}d`)
  if (h) partes.push(`${h}h`)
  partes.push(`${m}m`)
  return partes.join(' ')
}

// ───────────────────────── categorías y comandos ─────────────────────────

function infoCategoria(clave) {
  return CATEGORIAS[clave] || { emoji: '📂', titulo: String(clave).toUpperCase(), descripcion: 'Más comandos', alias: [] }
}

function resolverCategoria(termino) {
  const buscado = normalizar(termino)
  if (!buscado) return null
  for (const clave of [...ORDEN_CATEGORIAS, ...Object.keys(CATEGORIAS)]) {
    const info = CATEGORIAS[clave]
    if (!info) continue
    if (buscado === clave || buscado === normalizar(info.titulo) || info.alias.includes(buscado)) return clave
  }
  return null
}

function ordenarCategorias(categories) {
  const claves = [...categories.keys()]
  const conocidas = ORDEN_CATEGORIAS.filter((clave) => claves.includes(clave))
  const extras = claves.filter((clave) => !ORDEN_CATEGORIAS.includes(clave)).sort()
  return [...conocidas, ...extras]
}

/** Comandos únicos de cada categoría que ESTE usuario puede usar. */
function comandosVisibles(categories, contexto) {
  const resultado = new Map()
  for (const clave of ordenarCategorias(categories)) {
    const unicos = [...new Set(categories.get(clave) || [])]
      .filter((cmd) => evaluarPermiso(cmd, contexto).permitido)
      .sort((a, b) => a.name.localeCompare(b.name))
    if (unicos.length) resultado.set(clave, unicos)
  }
  return resultado
}

function marcaPermiso(cmd) {
  return cmd.ownerOnly || cmd.subbotOwnerOnly ? ' 🔒' : ''
}

function textoAliases(cmd, prefijo, max = 3) {
  const alias = (cmd.aliases || []).filter(Boolean).slice(0, max)
  return alias.length ? ` _(${alias.map((a) => prefijo + a).join(' · ')})_` : ''
}

function bloqueComando(cmd, prefijo) {
  let texto = `✧ *${prefijo}${cmd.name}*${marcaPermiso(cmd)}${textoAliases(cmd, prefijo)}\n`
  if (cmd.description) texto += `    _${recortar(cmd.description)}_\n`
  return texto + '\n'
}

// ───────────────────────── mensajes ─────────────────────────

function obtenerPerfil(msg) {
  try {
    const jid = msg.key.participantAlt || msg.key.participant || msg.key.remoteJid || ''
    const numero = jid.split('@')[0].split(':')[0]
    const usuario = obtenerUsuario(numero)
    if (!usuario || (usuario.xp === undefined && usuario.monedas === undefined)) return null
    const xp = usuario.xp || 0
    const nivel = Math.max(1, usuario.nivel || calcularNivel(xp))
    const logros = progresoLogros(usuario)
    return {
      nivel, xp, rango: obtenerRangoPorNivel(nivel)?.nombre || 'Novato', monedas: usuario.monedas || 0,
      racha: usuario.racha || 0, logros: logros.filter((l) => l.desbloqueado).length, totalLogros: logros.length,
    }
  } catch {
    return null
  }
}

/** Novedades que existen y que esta persona puede usar (las más recientes primero). */
function novedadesVisibles(visibles) {
  const porNombre = new Map()
  for (const [clave, lista] of visibles) for (const cmd of lista) porNombre.set(cmd.name, { cmd, clave })
  return NOVEDADES.map((n) => porNombre.get(n)).filter(Boolean)
}

/** Comandos más usados (según las estadísticas) que esta persona puede usar. */
function popularesVisibles(visibles, limite = 10) {
  let usos = {}
  try { usos = usosPorComando() } catch { /* sin estadísticas */ }
  const porNombre = new Map()
  for (const [clave, lista] of visibles) for (const cmd of lista) porNombre.set(cmd.name, { cmd, clave })
  return Object.entries(usos)
    .filter(([nombre, n]) => n > 0 && porNombre.has(nombre))
    .sort((a, b) => b[1] - a[1])
    .slice(0, limite)
    .map(([nombre, n]) => ({ ...porNombre.get(nombre), usos: n }))
}

function construirPortada({ msg, config, esSubBot, visibles, totalComandos, prefijo, conIndice = true }) {
  const nombreUsuario = msg.pushName || 'Usuario'
  const { hora, fecha } = obtenerHoraPeru()
  const perfil = obtenerPerfil(msg)
  const totalVisibles = [...visibles.values()].reduce((suma, lista) => suma + lista.length, 0)
  const nuevos = novedadesVisibles(visibles).slice(0, 4)

  let t = '╭━━━━━━━━━━━━━━━━━━━━━━━━╮\n'
  t += `┃     🌸 *${negrita(config.BOT_NAME || 'YuiBot-MD')}* 🌸\n`
  t += '╰━━━━━━━━━━━━━━━━━━━━━━━━╯\n\n'
  t += `${obtenerSaludo()}, *${nombreUsuario}* ✨\n\n`

  if (perfil) {
    const { barra, actual, span } = barraXp(perfil.xp, perfil.nivel)
    t += `╭─❖ 「 🏅 ${negrita('TU PERFIL')} 」 ❖─╮\n`
    t += `│ 🎖️ Nv. *${perfil.nivel}* ${perfil.rango} · 💰 *${perfil.monedas}*\n`
    t += `│ ✨ ${barra} *${actual}/${span}*\n`
    t += `│ 🔥 Racha *${perfil.racha}* día${perfil.racha === 1 ? '' : 's'} · 🏆 *${perfil.logros}/${perfil.totalLogros}*\n`
    t += '╰────────────────────────╯\n\n'
  }

  t += `╭─❖ 「 📌 ${negrita('INFORMACIÓN')} 」 ❖─╮\n`
  t += `│ 🤖 ${esSubBot ? '🔗 SubBot' : '🌸 Bot Principal'} · ⚡ Prefijo *${prefijo}*\n`
  t += `│ 📦 *${totalVisibles}* comandos para ti (${totalComandos} en total)\n`
  t += `│ ⏱️ Activo *${obtenerUptime()}* · 🕐 *${hora}*\n`
  t += `│ 📅 ${fecha}\n`
  t += '╰────────────────────────╯\n\n'

  if (nuevos.length) t += `🆕 ${negrita('Novedades')}: ${nuevos.map(({ cmd }) => `*${prefijo}${cmd.name}*`).join(' · ')}\n`
  t += `💡 ${tipDelDia(prefijo)}\n\n`

  if (!conIndice) {
    t += `👇 Toca *📂 Abrir menú*: elige un comando y se ejecuta solo.`
    return t
  }

  t += `╭─❖ 「 🗂️ ${negrita('CATEGORÍAS')} 」 ❖─╮\n`
  for (const [clave, lista] of visibles) {
    const info = infoCategoria(clave)
    t += `│ ${info.emoji} *${info.titulo}* · ${lista.length}\n`
    t += `│    ↳ ${prefijo}menu ${clave}\n`
  }
  t += '╰────────────────────────╯\n\n'

  t += `💡 *${prefijo}menu <categoría>* ver sus comandos\n`
  t += `🔍 *${prefijo}menu <palabra>* buscar (ej: ${prefijo}menu sticker)\n`
  t += `🆕 *${prefijo}menu novedades* · 🔥 *${prefijo}menu populares* · 🎲 *${prefijo}menu azar*\n`
  t += `📋 *${prefijo}menu todo* lista completa`
  return t
}

function construirPaginasCategoria(clave, lista, prefijo) {
  const info = infoCategoria(clave)
  const partes = partirBloques(lista.map((cmd) => bloqueComando(cmd, prefijo)))

  return partes.map((cuerpo, i) => {
    let t = `╭─❖ 「 ${info.emoji} ${negrita(info.titulo)} 」 ❖─╮\n`
    t += `│ ${info.descripcion}\n`
    t += `│ 📌 *${lista.length} comandos*${partes.length > 1 ? ` · página ${i + 1}/${partes.length}` : ''}\n`
    t += '╰────────────────────────╯\n\n'
    t += cuerpo
    if (i === partes.length - 1) t += `\n👇 Toca *▶️ Elegir comando* para ejecutarlo\n↩️ *${prefijo}menu* volver al inicio`
    return t
  })
}

function construirTodo(visibles, prefijo) {
  const bloques = []
  for (const [clave, lista] of visibles) {
    const info = infoCategoria(clave)
    bloques.push(`\n╭─❖ 「 ${info.emoji} ${negrita(info.titulo)} · ${lista.length} 」 ❖─╮\n`)
    for (const cmd of lista) bloques.push(`✧ *${prefijo}${cmd.name}*${marcaPermiso(cmd)}${cmd.description ? ` — _${recortar(cmd.description, 60)}_` : ''}\n`)
  }
  const partes = partirBloques(bloques)
  return partes.map((cuerpo, i) =>
    `📋 ${negrita('MENÚ COMPLETO')} · ${i + 1}/${partes.length}\n${cuerpo}${i === partes.length - 1 ? `\n↩️ *${prefijo}menu* volver al inicio` : ''}`
  )
}

function construirFicha(cmd, claveCategoria, prefijo, usos = 0, parecidos = []) {
  const info = infoCategoria(claveCategoria)
  let t = `╭─❖ 「 ✧ ${negrita(prefijo + cmd.name)} 」 ❖─╮\n`
  if (cmd.description) t += `│ 📝 ${cmd.description}\n`
  t += `│ 📂 ${negrita('Categoría')} » ${info.emoji} ${info.titulo}\n`
  if (cmd.aliases?.length) t += `│ 🔁 ${negrita('Alias')} » ${cmd.aliases.map((a) => prefijo + a).join(' · ')}\n`
  if (cmd.ownerOnly) t += `│ 🔒 ${negrita('Permiso')} » Solo owners del bot\n`
  else if (cmd.subbotOwnerOnly) t += `│ 🔒 ${negrita('Permiso')} » Dueño del subbot u owners\n`
  t += `│ ▶️ ${negrita('Uso')} » ${extraerUso(cmd, prefijo)}\n`
  if (usos > 0) t += `│ 📈 ${negrita('Usado')} » ${usos} ${usos === 1 ? 'vez' : 'veces'}\n`
  t += '╰────────────────────────╯\n'
  if (parecidos.length) t += `\n✨ ${negrita('Del mismo grupo')}: ${parecidos.map((n) => `*${prefijo}${n}*`).join(' · ')}\n`
  t += `\n↩️ *${prefijo}menu* volver al inicio`
  return t
}

function buscar(termino, visibles) {
  const buscado = normalizar(termino)
  const exactos = []
  const parciales = []
  for (const [clave, lista] of visibles) {
    for (const cmd of lista) {
      const nombres = [cmd.name, ...(cmd.aliases || [])].map(normalizar)
      if (nombres.includes(buscado)) exactos.push({ cmd, clave })
      else if (nombres.some((n) => n.includes(buscado)) || normalizar(cmd.description).includes(buscado)) parciales.push({ cmd, clave })
    }
  }
  return { exactos, parciales }
}

function sugerencias(termino, visibles) {
  const buscado = normalizar(termino)
  const nombres = []
  for (const lista of visibles.values()) for (const cmd of lista) nombres.push(cmd.name)
  return nombres
    .map((nombre) => ({ nombre, d: distancia(buscado, normalizar(nombre)) }))
    .filter(({ nombre, d }) => d <= Math.max(1, Math.floor(nombre.length / 3)))
    .sort((a, b) => a.d - b.d)
    .slice(0, 3)
    .map(({ nombre }) => nombre)
}

function construirResultados(termino, resultados, prefijo) {
  const todos = [...resultados.exactos, ...resultados.parciales]
  let t = `🔍 ${negrita('Resultados')} para *${termino}* · ${todos.length}\n\n`
  for (const { cmd, clave } of todos.slice(0, MAX_RESULTADOS)) {
    t += `${infoCategoria(clave).emoji} *${prefijo}${cmd.name}*${marcaPermiso(cmd)}`
    if (cmd.description) t += `\n    _${recortar(cmd.description, 70)}_`
    t += '\n'
  }
  if (todos.length > MAX_RESULTADOS) t += `\n…y ${todos.length - MAX_RESULTADOS} más. Sé más específico para afinar la búsqueda.\n`
  t += `\n👇 Toca *▶️ Elegir comando* para ejecutarlo\n↩️ *${prefijo}menu* volver al inicio`
  return t
}

// ───────────────────────── envío ─────────────────────────

const filaComando = (cmd, clave, prefijo, extra = '') => ({
  title: recortar(`${prefijo}${cmd.name}`, 24),
  description: recortar(`${extra}${cmd.description || infoCategoria(clave).descripcion}`, 72),
  id: `${prefijo}${cmd.name}`,
})

/** Accesos rápidos al inicio de la lista: llevan a otras partes del menú (ids distintos a los de los comandos). */
function seccionRapida(visibles, prefijo) {
  const rows = []
  if (novedadesVisibles(visibles).length) rows.push({ title: '🆕 Novedades', description: 'Lo último que agregué al bot', id: `${prefijo}menu novedades` })
  if (popularesVisibles(visibles, 1).length) rows.push({ title: '🔥 Más usados', description: 'Lo que más usa la gente', id: `${prefijo}menu populares` })
  rows.push({ title: '🗂️ Categorías', description: 'Elige por tema', id: `${prefijo}menu categorias` })
  rows.push({ title: '🎲 Sorpréndeme', description: 'Un comando al azar para descubrir', id: `${prefijo}menu azar` })
  rows.push({ title: '💡 Consejo del día', description: 'Un truco para sacarle más provecho', id: `${prefijo}menu consejo` })
  rows.push({ title: '🔎 Buscar', description: `Cómo buscar con ${prefijo}menu <palabra>`, id: `${prefijo}menu buscar` })
  rows.push({ title: '📋 Menú completo', description: 'Todos los comandos en texto', id: `${prefijo}menu todo` })
  return { title: '⚡ Accesos rápidos', rows }
}

/** Una sección rápida, y luego una por categoría con una fila por comando; al tocarla se ejecuta. */
function construirSecciones(visibles, prefijo) {
  const secciones = [seccionRapida(visibles, prefijo)]
  for (const [clave, lista] of visibles) {
    const info = infoCategoria(clave)
    secciones.push({ title: recortar(`${info.emoji} ${info.titulo}`, 24), rows: lista.map((cmd) => filaComando(cmd, clave, prefijo)) })
  }
  return secciones
}

/** Filas para saltar a la categoría anterior/siguiente o volver a la portada. */
function seccionNavegacion(clave, visibles, prefijo) {
  const claves = [...visibles.keys()]
  const i = claves.indexOf(clave)
  const rows = []
  if (i > 0) { const a = infoCategoria(claves[i - 1]); rows.push({ title: recortar(`⬅️ ${a.titulo}`, 24), description: a.descripcion.slice(0, 72), id: `${prefijo}menu ${claves[i - 1]}` }) }
  if (i >= 0 && i < claves.length - 1) { const s = infoCategoria(claves[i + 1]); rows.push({ title: recortar(`➡️ ${s.titulo}`, 24), description: s.descripcion.slice(0, 72), id: `${prefijo}menu ${claves[i + 1]}` }) }
  rows.push({ title: '🏠 Inicio', description: 'Volver a la portada del menú', id: `${prefijo}menu portada` })
  rows.push({ title: '🗂️ Categorías', description: 'Ver todas las categorías', id: `${prefijo}menu categorias` })
  return { title: '🧭 Navegar', rows }
}

const cacheMedios = new Map() // ruta → { mtimeMs, buffer }

function leerMedio(ruta) {
  const { mtimeMs } = fs.statSync(ruta)
  const guardado = cacheMedios.get(ruta)
  if (guardado && guardado.mtimeMs === mtimeMs) return guardado.buffer
  const buffer = fs.readFileSync(ruta)
  cacheMedios.set(ruta, { mtimeMs, buffer })
  return buffer
}

function botonesRapidos(esGrupo, visibles, prefijo) {
  const preferidas = esGrupo ? ['grupo', 'diversion'] : ['utilidad', 'rpg']
  const botones = [{ buttonId: `${prefijo}menu todo`, buttonText: { displayText: '📋 Menú completo' }, type: 1 }]
  for (const clave of preferidas) {
    if (!visibles.has(clave)) continue
    const info = infoCategoria(clave)
    botones.push({ buttonId: `${prefijo}menu ${clave}`, buttonText: { displayText: `${info.emoji} ${info.titulo.charAt(0)}${info.titulo.slice(1).toLowerCase()}` }, type: 1 })
  }
  return botones.slice(0, 3)
}

/**
 * Portada en UN solo mensaje: imagen/gif + una cajita desplegable con accesos rápidos y
 * todos los comandos (single_select). Si algo falla, baja de nivel: botones rápidos →
 * medio + texto → solo texto, siempre con el índice de categorías.
 */
async function enviarPortada(sock, jid, msg, datos, config) {
  const { visibles, prefijo, esGrupo } = datos
  const opciones = { quoted: msg }
  const pie = `${config.BOT_NAME || 'YuiBot-MD'} • ${prefijo}menu <categoría>`
  const textoCorto = construirPortada({ ...datos, conIndice: false })
  const textoLargo = construirPortada({ ...datos, conIndice: true })

  const botonLista = config.MENU_LISTA !== false
    ? [{ text: '📂 Abrir menú', sections: construirSecciones(visibles, prefijo) }]
    : null
  const botonesRapidos_ = config.MENU_BOTONES !== false ? botonesRapidos(esGrupo, visibles, prefijo) : []

  const medios = config.MENU_IMAGES || []
  const elegido = medios.length ? medios[Math.floor(Math.random() * medios.length)] : null
  let base = null
  if (elegido) {
    try {
      base = elegido.animado ? { video: leerMedio(elegido.ruta), gifPlayback: true } : { image: leerMedio(elegido.ruta) }
    } catch (error) {
      console.error('[MENU] No se pudo leer el medio:', error.message)
    }
  }

  const intentos = []
  if (botonLista) {
    if (base) intentos.push(['lista con medio', { ...base, caption: textoCorto, footer: pie, buttons: botonLista }])
    intentos.push(['lista', { text: textoCorto, footer: pie, buttons: botonLista }])
  }
  if (botonesRapidos_.length) {
    if (base) intentos.push(['botones con medio', { ...base, caption: textoLargo, footer: pie, buttons: botonesRapidos_, headerType: elegido.animado ? 5 : 4 }])
    intentos.push(['botones', { text: textoLargo, footer: pie, buttons: botonesRapidos_, headerType: 1 }])
  }
  if (base) intentos.push(['medio', { ...base, caption: textoLargo }])
  intentos.push(['texto', { text: textoLargo }])

  let ultimoError
  for (const [nombre, contenido] of intentos) {
    try {
      await sock.sendMessage(jid, contenido, opciones)
      return
    } catch (error) {
      ultimoError = error
      if (esConexionCerrada(error)) { console.error('[MENU] Sin conexión con WhatsApp; no se reintenta con otros formatos.'); throw error }
      console.error(`[MENU] Falló el envío (${nombre}), probando una opción más simple:`, error.message)
    }
  }
  throw ultimoError
}

/** Texto con lista desplegable y/o botones; si WhatsApp los rechaza (o están apagados) cae a texto. */
function enviarInteractivo(sock, jid, msg, config, { texto, tituloLista = '▶️ Elegir comando', secciones = null, botones = [] }) {
  const pie = `${config.BOT_NAME || 'YuiBot-MD'} • ${(config.PREFIXES && config.PREFIXES[0]) || '.'}menu`
  const intentos = []
  if (secciones && config.MENU_LISTA !== false) intentos.push(['lista', { text: texto, footer: pie, buttons: [{ text: tituloLista, sections: secciones }] }])
  if (botones.length && config.MENU_BOTONES !== false) intentos.push(['botones', { text: texto, footer: pie, buttons: botones.slice(0, 3) }])
  intentos.push(['texto', { text: texto }])
  return enviarConRespaldo(sock, jid, intentos, { quoted: msg }, 'MENU')
}

async function enviarTextos(sock, jid, msg, textos, final = null, config = {}) {
  const ultimo = textos.length - 1
  for (const [i, texto] of textos.entries()) {
    if (final && i === ultimo) await enviarInteractivo(sock, jid, msg, config, { texto, ...final })
    else await sock.sendMessage(jid, { text: texto }, { quoted: msg })
  }
}

// ───────────────────────── subcomandos ─────────────────────────

const SUBCOMANDOS = {
  novedades: ['novedades', 'novedad', 'nuevo', 'nuevos', 'new'],
  populares: ['populares', 'popular', 'masusados', 'mas usados', 'tendencias'],
  categorias: ['categorias', 'categoria', 'indice', 'categories'],
  azar: ['azar', 'random', 'sorprendeme', 'aleatorio'],
  consejo: ['consejo', 'tip', 'truco', 'consejos'],
  buscar: ['buscar', 'search', 'buscador'],
  portada: ['portada', 'inicio'], // (la palabra "inicio" también es alias de la categoría main: aquí gana la portada)
}

function resolverSubcomando(termino) {
  const t = normalizar(termino)
  return Object.keys(SUBCOMANDOS).find((k) => SUBCOMANDOS[k].includes(t)) || null
}

async function subNovedades(ctx) {
  const { sock, jid, msg, config, visibles, prefijo } = ctx
  const lista = novedadesVisibles(visibles)
  if (!lista.length) return sock.sendMessage(jid, { text: '🆕 Aún no hay novedades para ti.' }, { quoted: msg })
  let t = `╭─❖ 「 🆕 ${negrita('NOVEDADES')} 」 ❖─╮\n│ Lo último que agregué · ${lista.length}\n╰────────────────────────╯\n\n`
  for (const { cmd } of lista.slice(0, 15)) t += bloqueComando(cmd, prefijo)
  t += `👇 Toca *▶️ Elegir comando* para probarlo\n↩️ *${prefijo}menu* volver al inicio`
  return enviarInteractivo(sock, jid, msg, config, { texto: t, secciones: [{ title: '🆕 Novedades', rows: lista.slice(0, 15).map(({ cmd, clave }) => filaComando(cmd, clave, prefijo)) }] })
}

async function subPopulares(ctx) {
  const { sock, jid, msg, config, visibles, prefijo } = ctx
  const lista = popularesVisibles(visibles)
  if (!lista.length) return sock.sendMessage(jid, { text: `🔥 Todavía no hay estadísticas de uso. Usa el bot un rato y vuelve.\n\n↩️ *${prefijo}menu* volver al inicio` }, { quoted: msg })
  const medallas = ['🥇', '🥈', '🥉']
  let t = `╭─❖ 「 🔥 ${negrita('MÁS USADOS')} 」 ❖─╮\n│ Lo que más usa la gente\n╰────────────────────────╯\n\n`
  lista.forEach(({ cmd, usos }, i) => { t += `${medallas[i] || `${i + 1}.`} *${prefijo}${cmd.name}* · ${usos} ${usos === 1 ? 'uso' : 'usos'}\n` })
  t += `\n👇 Toca *▶️ Elegir comando* para ejecutarlo\n↩️ *${prefijo}menu* volver al inicio`
  return enviarInteractivo(sock, jid, msg, config, { texto: t, secciones: [{ title: '🔥 Más usados', rows: lista.map(({ cmd, clave, usos }) => filaComando(cmd, clave, prefijo, `${usos} usos · `)) }] })
}

async function subCategorias(ctx) {
  const { sock, jid, msg, config, visibles, prefijo } = ctx
  let t = `╭─❖ 「 🗂️ ${negrita('CATEGORÍAS')} 」 ❖─╮\n│ Elige un tema\n╰────────────────────────╯\n\n`
  const rows = []
  for (const [clave, lista] of visibles) {
    const info = infoCategoria(clave)
    t += `${info.emoji} *${info.titulo}* · ${lista.length}\n    _${info.descripcion}_\n`
    rows.push({ title: recortar(`${info.emoji} ${info.titulo}`, 24), description: recortar(`${lista.length} comandos · ${info.descripcion}`, 72), id: `${prefijo}menu ${clave}` })
  }
  t += `\n👇 Toca *🗂️ Elegir categoría*`
  return enviarInteractivo(sock, jid, msg, config, { texto: t, tituloLista: '🗂️ Elegir categoría', secciones: [{ title: 'Categorías', rows }] })
}

async function subAzar(ctx) {
  const { sock, jid, msg, config, visibles, prefijo } = ctx
  const todos = [...visibles.entries()].flatMap(([clave, lista]) => lista.filter((c) => !c.ownerOnly && !c.subbotOwnerOnly).map((cmd) => ({ cmd, clave })))
  if (!todos.length) return sock.sendMessage(jid, { text: '🎲 No hay comandos para mostrar.' }, { quoted: msg })
  const { cmd, clave } = todos[Math.floor(Math.random() * todos.length)]
  return enviarFicha(ctx, cmd, clave, `🎲 *Tu comando sorpresa:*\n\n`)
}

async function subConsejo(ctx, anterior = '') {
  const { sock, jid, msg, config, prefijo } = ctx
  const texto = `💡 ${negrita('CONSEJO')}\n\n${tipAlAzar(prefijo, anterior)}\n\n↩️ *${prefijo}menu* volver al inicio`
  return enviarInteractivo(sock, jid, msg, config, { texto, botones: [{ text: '💡 Otro consejo', id: `${prefijo}menu consejo` }, { text: '↩️ Menú', id: `${prefijo}menu` }] })
}

function subBuscar({ sock, jid, msg, prefijo }) {
  return sock.sendMessage(jid, {
    text: `🔎 ${negrita('BUSCAR COMANDOS')}\n\nEscribe *${prefijo}menu* seguido de lo que buscas:\n✧ *${prefijo}menu sticker*\n✧ *${prefijo}menu descargar*\n✧ *${prefijo}menu tarea*\n\nBusco en nombres, alias y descripciones, y si te equivocas al escribir te sugiero el correcto.`,
  }, { quoted: msg })
}

async function enviarFicha(ctx, cmd, clave, encabezado = '') {
  const { sock, jid, msg, config, visibles, prefijo } = ctx
  let usos = 0
  try { usos = usosPorComando()[cmd.name] || 0 } catch { /* sin estadísticas */ }
  const parecidos = (visibles.get(clave) || []).filter((c) => c.name !== cmd.name && !c.ownerOnly).slice(0, 3).map((c) => c.name)
  const info = infoCategoria(clave)
  return enviarInteractivo(sock, jid, msg, config, {
    texto: `${encabezado}${construirFicha(cmd, clave, prefijo, usos, parecidos)}`,
    botones: [
      { text: `${info.emoji} ${info.titulo.charAt(0)}${info.titulo.slice(1).toLowerCase()}`.slice(0, 20), id: `${prefijo}menu ${clave}` },
      { text: '🎲 Otro al azar', id: `${prefijo}menu azar` },
      { text: '↩️ Menú', id: `${prefijo}menu` },
    ],
  })
}

module.exports = {
  name: 'menu',
  aliases: ['ayuda', 'help'],
  description: 'Menú por categorías: .menu <categoría>, .menu <palabra> para buscar, .menu novedades, populares o azar',
  category: 'main',

  async execute(sock, msg, args, { categories, commands, config, esSubBot, subbotNumero }) {
    const jid = msg.key.remoteJid
    const esGrupo = jid.endsWith('@g.us')
    const prefijo = (config.PREFIXES && config.PREFIXES[0]) || '.'
    const termino = args.join(' ').trim()

    const visibles = comandosVisibles(categories, { sock, msg, config, esSubBot: Boolean(esSubBot), subbotNumero })
    const ctx = { sock, jid, msg, config, visibles, prefijo }

    // ── .menu (portada)
    const sub = termino ? resolverSubcomando(termino) : 'portada'
    if (sub === 'portada') {
      const totalComandos = [...new Set(commands.values())].length
      return enviarPortada(sock, jid, msg, { msg, config, esSubBot, visibles, totalComandos, prefijo, esGrupo }, config)
    }

    // ── .menu novedades / populares / categorias / azar / consejo / buscar
    if (sub === 'novedades') return subNovedades(ctx)
    if (sub === 'populares') return subPopulares(ctx)
    if (sub === 'categorias') return subCategorias(ctx)
    if (sub === 'azar') return subAzar(ctx)
    if (sub === 'consejo') return subConsejo(ctx)
    if (sub === 'buscar') return subBuscar(ctx)

    // ── .menu todo
    if (['todo', 'todos', 'all', 'full', 'completo'].includes(normalizar(termino))) {
      return enviarTextos(sock, jid, msg, construirTodo(visibles, prefijo))
    }

    // ── .menu <categoría>
    const clave = resolverCategoria(termino)
    if (clave && categories.has(clave)) {
      const lista = visibles.get(clave)
      if (!lista) {
        return sock.sendMessage(jid, { text: `🔒 No tienes acceso a los comandos de *${infoCategoria(clave).titulo}*.\n\n↩️ *${prefijo}menu* volver al inicio` }, { quoted: msg })
      }
      const secciones = [
        { title: recortar(`${infoCategoria(clave).emoji} ${infoCategoria(clave).titulo}`, 24), rows: lista.map((cmd) => filaComando(cmd, clave, prefijo)) },
        seccionNavegacion(clave, visibles, prefijo),
      ]
      return enviarTextos(sock, jid, msg, construirPaginasCategoria(clave, lista, prefijo), { secciones }, config)
    }

    // ── .menu <comando> o .menu <palabra>
    const resultados = buscar(termino, visibles)

    if (resultados.exactos.length === 1) {
      const { cmd, clave: claveCmd } = resultados.exactos[0]
      return enviarFicha(ctx, cmd, claveCmd)
    }

    const todos = [...resultados.exactos, ...resultados.parciales]
    if (todos.length > 0) {
      return enviarInteractivo(sock, jid, msg, config, {
        texto: construirResultados(termino, resultados, prefijo),
        secciones: [{ title: '🔍 Resultados', rows: todos.slice(0, MAX_RESULTADOS).map(({ cmd, clave: c }) => filaComando(cmd, c, prefijo)) }],
      })
    }

    const parecidos = sugerencias(termino, visibles)
    let texto = `❌ No encontré nada para *${termino}*.`
    if (parecidos.length) texto += `\n\n¿Quisiste decir ${parecidos.map((n) => `*${prefijo}${n}*`).join(', ')}?`
    texto += `\n\n↩️ *${prefijo}menu* ver las categorías`
    return sock.sendMessage(jid, { text: texto }, { quoted: msg })
  },

  // Funciones internas expuestas solo para las pruebas.
  _internos: { negrita, normalizar, recortar, distancia, partirBloques, resolverCategoria, resolverSubcomando, ordenarCategorias, construirSecciones, construirPortada, CATEGORIAS, ORDEN_CATEGORIAS },
}
