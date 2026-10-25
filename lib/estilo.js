// Estilo visual compartido de YuiBot-MD. Todos los comandos arman sus
// respuestas con estos bloques para que se vean iguales y bonitas.
//
//   ╭━━━〔 🎵 𝗧𝗜́𝗧𝗨𝗟𝗢 〕━━━⬣
//   ┃ ✦ 𝗖𝗮𝗻𝗮𝗹: valor
//   ┃ ✦ 𝗗𝘂𝗿𝗮𝗰𝗶𝗼́𝗻: 3:45
//   ╰━━━━━━━━━━━━━━━⬣
//   > pie opcional

/** "Hola 123" → "𝗛𝗼𝗹𝗮 𝟭𝟮𝟯" (negrita Unicode; deja intactos acentos y símbolos). */
function negrita(texto) {
  return String(texto).replace(/[A-Za-z0-9]/g, (c) => {
    const code = c.charCodeAt(0)
    if (code >= 65 && code <= 90) return String.fromCodePoint(0x1d5d4 + (code - 65))
    if (code >= 97 && code <= 122) return String.fromCodePoint(0x1d5ee + (code - 97))
    return String.fromCodePoint(0x1d7ec + (code - 48))
  })
}

/** Versalitas: "Hola" → "ʜᴏʟᴀ" (para subtítulos discretos). */
const MAPA_VERSALITAS = 'ᴀʙᴄᴅᴇꜰɢʜɪᴊᴋʟᴍɴᴏᴘǫʀsᴛᴜᴠᴡxʏᴢ'
function versalitas(texto) {
  return String(texto).toLowerCase().replace(/[a-z]/g, (c) => MAPA_VERSALITAS[c.charCodeAt(0) - 97])
}

const ANCHO_BASE = 15
const base = () => '━'.repeat(ANCHO_BASE)

/** Línea de datos dentro de una caja: ┃ ✦ 𝗘𝘁𝗶𝗾𝘂𝗲𝘁𝗮: valor */
function fila(etiqueta, valor, icono = '✦') {
  if (valor === undefined || valor === null || valor === '') return null
  return `┃ ${icono} ${negrita(etiqueta)}: ${valor}`
}

/**
 * Caja con título.
 * @param {string} emoji
 * @param {string} titulo
 * @param {Array<string|[string,any]|null>} filas  texto suelto o pares [etiqueta, valor]
 * @param {string} [pie]  texto final en cita (>)
 */
function caja(emoji, titulo, filas = [], pie = '') {
  const lineas = filas
    .map((f) => (Array.isArray(f) ? fila(f[0], f[1], f[2]) : f === null || f === undefined ? null : (String(f).startsWith('┃') ? String(f) : `┃ ${f}`)))
    .filter(Boolean)
  const partes = [`╭━━━〔 ${emoji} ${negrita(String(titulo).toUpperCase())} 〕━━━⬣`, ...lineas, `╰${base()}⬣`]
  if (pie) partes.push(`> ${pie}`)
  return partes.join('\n')
}

/** Lista con viñetas ✦ (o numerada). */
function lista(items, { numerada = false } = {}) {
  return items.map((it, i) => `${numerada ? `${i + 1}.` : '✦'} ${it}`).join('\n')
}

const error = (texto) => `❌ ${texto}`
const exito = (texto) => `✅ ${texto}`
const aviso = (texto) => `⚠️ ${texto}`
const espera = (texto) => `⏳ ${texto}`

/** Mensaje de uso: ❌ Falta algo + ejemplo. */
function uso(prefijo, comando, ejemplo, motivo = 'Faltan datos.') {
  return `❌ ${motivo}\n\n📌 ${negrita('Ejemplo')}: ${prefijo}${comando}${ejemplo ? ` ${ejemplo}` : ''}`
}

module.exports = { negrita, versalitas, fila, caja, lista, error, exito, aviso, espera, uso }
