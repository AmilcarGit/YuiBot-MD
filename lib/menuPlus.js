// Piezas del menú: novedades, consejos del día, barra de XP y "cómo se usa" de cada comando.
const { xpParaNivel } = require('./db')

// Comandos más nuevos, del más reciente al más viejo (el menú muestra solo los que existen y puedes usar).
const NOVEDADES = [
  'dl', 'autolink', 'twitter', 'reddit', 'mediafire', 'gitclone', 'webtext', 'wayback', 'npmdl', 'gdrive',
  'marcador', 'envivo', 'seguirequipo', 'tablaliga', 'verunavez', 'tarea', 'logros', 'topsemana', 'misclases', 'libreta',
]

// Consejos que rotan cada día. {P} se cambia por el prefijo.
const TIPS = [
  'Pega un enlace con *{P}dl* y lo descargo solo (TikTok, YouTube, X, Reddit…). Añade *audio* para bajar solo el sonido.',
  'Activa *{P}autolink on* en tu grupo: cada enlace pegado muestra botones para descargarlo.',
  'Responde a un mensaje de "ver una vez" con *{P}vv* y te lo envío a tu privado.',
  'Con *{P}tarea* guardo tus pendientes y te aviso solos antes de la entrega.',
  '*{P}tarea resumen on* te manda cada mañana tus clases, tareas y exámenes.',
  'Sigue a tu equipo con *{P}seguirequipo* y te aviso cada gol, roja y el resultado final.',
  '*{P}marcador* muestra los partidos de hoy y *{P}envivo* los que se juegan ahora.',
  'Mira tus insignias y premios con *{P}logros*; el ranking de la semana es *{P}topsemana*.',
  '*{P}afk <motivo>* avisa a quien te mencione que estás ausente.',
  '*{P}recordar 30m sacar la ropa* y te lo recuerdo por privado.',
  '*{P}pomodoro* te ayuda a estudiar con ciclos de concentración y descanso.',
  '*{P}libreta* guarda tus notas por materia y calcula tu promedio; *{P}notaminima* dice qué nota necesitas.',
  '*{P}gitclone dueño/repo* te manda cualquier repositorio de GitHub en ZIP.',
  '*{P}webtext <enlace>* te deja leer un artículo sin anuncios, y si es largo te lo manda en .txt.',
  '*{P}wayback <enlace>* muestra cómo era una página antes. Añade un año para elegir la época.',
  '*{P}menu <palabra>* busca comandos: prueba *{P}menu sticker* o *{P}menu descargar*.',
  '*{P}menu populares* muestra lo que más usa la gente.',
  '*{P}menu azar* te enseña un comando al azar, ideal para descubrir cosas nuevas.',
  'Toca *📂 Abrir menú* y elige cualquier comando: se ejecuta solo.',
  '*{P}perfil* muestra tu tarjeta con nivel, XP, rango e insignias.',
  '*{P}tts <texto>* convierte texto en una nota de voz.',
  '*{P}rep @usuario* da reputación; llega a 10 y desbloqueas un logro.',
]

const tipDelDia = (prefijo, ahora = Date.now(), desplazamiento = 0) => {
  const dia = Math.floor(ahora / 86400000)
  return TIPS[(dia + desplazamiento) % TIPS.length].replace(/\{P\}/g, prefijo)
}

const tipAlAzar = (prefijo, excluir = '') => {
  const candidatos = TIPS.map((t) => t.replace(/\{P\}/g, prefijo)).filter((t) => t !== excluir)
  return candidatos[Math.floor(Math.random() * candidatos.length)]
}

/** Barra de experiencia hacia el siguiente nivel. */
function barraXp(xp, nivel, segmentos = 10) {
  const base = xpParaNivel(nivel)
  const meta = xpParaNivel(nivel + 1)
  const span = Math.max(1, meta - base)
  const actual = Math.max(0, Math.min(span, (Number(xp) || 0) - base))
  const llenos = Math.round((actual / span) * segmentos)
  return { barra: '▰'.repeat(llenos) + '▱'.repeat(segmentos - llenos), actual, span, pct: Math.round((actual / span) * 100) }
}

/** "Cómo se usa": toma el ejemplo que la descripción ya trae (ej. ".dl <enlace> [audio]") o el nombre solo. */
function extraerUso(cmd, prefijo) {
  const nombres = [cmd.name, ...(cmd.aliases || [])].map((n) => n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')
  const re = new RegExp(`\\.(?:${nombres})(?:\\s+(?:<[^>]+>|\\[[^\\]]+\\]|[\\wáéíóúñ@/|+-]+))*`, 'i')
  const m = String(cmd.description || '').match(re)
  return `${prefijo}${(m ? m[0] : `.${cmd.name}`).slice(1).trim()}`
}

module.exports = { NOVEDADES, TIPS, tipDelDia, tipAlAzar, barraXp, extraerUso }
