// Código Oficial de YuiBot-MD.by AmilcarGit
import ajustes from '../../ajustes.js'
import { listar } from '../../nucleo/cargador.js'
import { caja, dice, firma, fuente, nieve, temaActivo } from '../../estilo/index.js'
import { conBotones } from '../../nucleo/botones.js'
import { formato } from '../../nucleo/utiles.js'
import { ZONA } from '../../estilo/temas.js'

const titulos = {
  general: 'General',
  economia: 'Economía',
  juegos: 'Juegos',
  descargas: 'Descargas',
  herramientas: 'Herramientas',
  stickers: 'Stickers',
  grupo: 'Grupo',
  subbots: 'Sub-bots',
  dueno: 'Dueño'
}

const orden = Object.keys(titulos)
const posicion = c => (orden.includes(c) ? orden.indexOf(c) : orden.length)

// Icono de cada comando en el desplegable; los que no están usan el de su categoría.
export const ICONOS = {
  clima: '🌤️', dueno: '👑', menu: '📜', ping: '🏓', terminos: '📋', tomp3: '🎶', daily: '🎁', dar: '💝', gacha: '🎰', inventario: '🎒', perfil: '🪪', registrar: '📝', tienda: '🛒', top: '🏆', trabajar: '⚒️',
  adivina: '🔮', dado: '🎲', moneda: '🪙', ppt: '✊', ruleta: '🎡', play: '🎵', yts: '🔎', ytmp3: '🎧', ytmp4: '🎬', pin: '📌', pinvid: '📹', facebook: '📘', tiktok: '🎵', instagram: '📸', twitter: '🐦', threads: '🧵', spotify: '🟢', soundcloud: '🟠',
  acortar: '🔗', calc: '🧮', cambio: '💱', hora: '🕒', qr: '📱', traducir: '🌐', wiki: '📚', tts: '🎙️', ssweb: '🖼️', reaccion: '🤗', sticker: '🎀', stickerly: '🧩', saudio: '🔊', toimg: '🖼️',
  sorteo: '🎟️', todos: '📣', hidetag: '👻', kick: '🚪', promote: '⬆️', demote: '⬇️', antienlaces: '🔗', antifalsos: '🛡️', bienvenida: '👋', serbot: '🤖', mibot: '📡', detenerbot: '🛑', cupos: '🎟️', quitarbot: '🗑️', prefijo: '⚙️', letra: '🎼', anime: '🎌', brat: '💚', attp: '🌈', ship: '💘', verdadoreto: '🔮', nombrebot: '🏷️', subbots: '🤖', datos: '📊', reiniciar: '♻️', tema: '🎨', web: '🌍', ia: '🤖', noticias: '📰', apk: '📲', mediafire: '📁', modoadmin: '🔒'
}
/** Resumen corto para el desplegable: lo que va antes de los dos puntos (sin el ejemplo de uso). */
export const resumen = ayuda => String(ayuda || '').split(/:\s/)[0].replace(/\s+\.\w+.*$/, '').trim()

/** Barra de progreso hacia el siguiente nivel (nivel = √(xp/10) + 1, igual que en nucleo/juego.js). */
function progreso(xp, nivel, largo = 8) {
  const desde = 10 * (nivel - 1) ** 2; const hasta = 10 * nivel ** 2
  const p = Math.min(1, Math.max(0, (xp - desde) / (hasta - desde || 1)))
  const llenos = Math.round(p * largo)
  return { barra: '▰'.repeat(llenos) + '▱'.repeat(largo - llenos), porcentaje: Math.round(p * 100) }
}

export const ENLACES = { chaty: 'https://chaty-weld.vercel.app', datos: 'https://yuibot-datos.vercel.app/yui' }
const RANGOS = [[1, '🌱 Novato'], [3, '📘 Aprendiz'], [6, '🗡️ Aventurero'], [10, '🛡️ Veterano'], [15, '🔮 Maestro'], [25, '👑 Leyenda']]
const rangoDe = nivel => RANGOS.filter(([desde]) => nivel >= desde).at(-1)[1]
const CONSEJOS = ['{p}tts hola, soy Yui 🎙️', '{p}abrazo @amigo 🤗', '{p}spotify bad bunny 🎧', '{p}s para crear stickers 🎀', '{p}tiktok enlace 🎵', '{p}ssweb google.com 📸', '{p}traducir en hola 🌐', '{p}gacha para invocar 🎰']

/** Menú corto (con botones): una tarjeta con los datos de quien lo pidió; los comandos van en el desplegable. */
export function menuCompacto({ tema, nombre, nombreBot = ajustes.nombre, prefijo, total, categorias, usuario = {}, ahora = new Date(), zona = ZONA }) {
  const t = tema.emojis
  const n = Number.isFinite(usuario.nivel) ? usuario.nivel : null
  const xp = Number.isFinite(usuario.xp) ? usuario.xp : 0
  const { barra, porcentaje } = n ? progreso(xp, n) : {}
  const fecha = new Intl.DateTimeFormat('es', { weekday: 'long', day: 'numeric', month: 'long', timeZone: zona }).format(ahora)
  const hora = new Intl.DateTimeFormat('es', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: zona }).format(ahora)
  const h = Number(new Intl.DateTimeFormat('en-GB', { hour: '2-digit', hour12: false, timeZone: zona }).format(ahora)) % 24
  const saludo = h < 6 ? '🌙 Buenas madrugadas' : h < 12 ? '🌅 Buenos días' : h < 19 ? '☀️ Buenas tardes' : '🌙 Buenas noches'
  const rotulo = txt => `${fuente(txt, 'mini')}`
  const consejo = CONSEJOS[Math.floor(ahora.getTime() / 3600e3) % CONSEJOS.length].replace('{p}', prefijo)
  return [
    `┏━━━━━ ${t.titulo} ━━━━━┓`,
    `   ${fuente(nombreBot, tema.fuente)}`,
    `┗━━━━━ ${t.item} ━━━━━┛`,
    `${saludo}, *${nombre}* ${t.persona}`,
    '',
    `╭─ ${t.nivel} ${rotulo('perfil')} ─────────`,
    n && `│ ${rangoDe(n)}  ·  Nivel *${n}*`,
    n && `│ ${barra} ${porcentaje}%`,
    Number.isFinite(usuario.monedas) && `│ ${t.dinero} ${formato(usuario.monedas)}${usuario.racha ? `   ${t.racha} Racha ${usuario.racha}` : ''}${xp ? `   ${t.xp} ${formato(xp)} XP` : ''}`,
    '╰──────────────',
    `╭─ 📅 ${rotulo('hoy')} ─────────────`,
    `│ ${fecha.charAt(0).toUpperCase()}${fecha.slice(1)}`,
    `│ 🕒 ${hora}  ·  ⚙️ Prefijo *${prefijo}*  ·  📚 ${total}`,
    '╰──────────────',
    `╭─ 🌐 ${rotulo('enlaces')} ───────────`,
    `│ 💬 *Chaty* · charla como en WhatsApp (pronto Yui estará ahí)`,
    `│ ${ENLACES.chaty}`,
    `│ 📊 *Base de datos de Yui*`,
    `│ ${ENLACES.datos}`,
    '╰──────────────',
    `${t.item} Prueba: *${consejo}*`,
    '👇 Toca *📜 Comandos* y elige'
  ].filter(x => x !== null && x !== false && x !== undefined).join('\n')
}

export default {
  nombre: 'menu',
  alias: ['grimorio', 'ayuda'],
  categoria: 'general',
  ayuda: 'Muestra todos los comandos',
  async ejecutar(sock, m, ctx) {
    const tema = temaActivo()
    const visibles = listar().filter(h => !h.soloDueno || ctx.esDueno)
    const porCategoria = new Map()
    for (const h of visibles) {
      if (!porCategoria.has(h.categoria)) porCategoria.set(h.categoria, [])
      porCategoria.get(h.categoria).push(h)
    }

    const elegida = ctx.args[0]?.toLowerCase()
    const unica = elegida && porCategoria.has(elegida)
    const claves = [...porCategoria.keys()].sort((a, b) => posicion(a) - posicion(b))

    const cabecera = caja(ctx.nombreBot || ajustes.nombre, [
      dice('saludo', { nombre: ctx.usuario.nombre || 'viajero' }),
      '',
      `${tema.emojis.item} Prefijo: ${ctx.prefijo}`,
      `${tema.emojis.item} Comandos: ${visibles.length}`,
      `${tema.emojis.item} Estilo: ${tema.nombre}`
    ])

    const mostradas = unica ? [elegida] : claves
    const desplegable = {
      texto: '📜 Comandos',
      // WhatsApp admite 10 filas por sección: las categorías largas se parten en partes.
      secciones: mostradas.flatMap(c => {
        const filas = porCategoria.get(c).sort((a, b) => a.nombre.localeCompare(b.nombre))
          .map(h => ({ titulo: `${ICONOS[h.nombre] || tema.iconos?.[c] || tema.emojis.item} ${ctx.prefijo}${h.nombre}`, descripcion: resumen(h.ayuda), cmd: h.nombre }))
        const partes = Math.ceil(filas.length / 10)
        return Array.from({ length: partes }, (_, i) => ({ titulo: `${tema.iconos?.[c] || tema.emojis.item} ${titulos[c] || c}${partes > 1 ? ` ${i + 1}/${partes}` : ` · ${filas.length}`}`, filas: filas.slice(i * 10, i * 10 + 10) }))
      })
    }

    // Con botones el mensaje es corto y bonito: el detalle de cada comando va en el desplegable.
    if (ctx.botonesActivos) {
      const texto = menuCompacto({ tema, nombre: ctx.usuario.nombre || 'viajero', prefijo: ctx.prefijo, total: visibles.length, nombreBot: ctx.nombreBot, usuario: ctx.usuario, categorias: mostradas.map(c => ({ clave: c, titulo: titulos[c] || c, nombres: porCategoria.get(c).map(h => h.nombre).sort() })) })
      return conBotones(ctx, texto, [desplegable], { media: ajustes.menuMedia })
    }

    const bloques = mostradas.map(c => caja(
      titulos[c] || c,
      porCategoria.get(c)
        .sort((a, b) => a.nombre.localeCompare(b.nombre))
        .map(h => `${tema.emojis.item} ${ctx.prefijo}${h.nombre} › ${h.ayuda}`),
      { emoji: tema.iconos?.[c] }
    ))

    const consejo = unica
      ? `💡 Usa ${ctx.prefijo}menu para ver todo.`
      : `💡 Usa ${ctx.prefijo}menu categoría para ver solo una.`

    await ctx.responder([nieve(), cabecera, ...bloques, consejo, firma()].join('\n\n'))
  }
}
