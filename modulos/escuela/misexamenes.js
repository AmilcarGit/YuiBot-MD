// .misexamenes — fechas de exámenes con cuenta regresiva y avisos automáticos.
const { caja } = require('../../lib/estilo')
const { interpretarFecha, describirDuracion, formatearFechaPeru } = require('../../lib/fechas')
const recordatorios = require('../../lib/recordatorios')
const escuela = require('../../lib/escuela')
const { jidPrivado } = require('../../lib/jids')

const DIA_MS = 86400000
const esDia = (t) => /^(hoy|ma[ñn]ana|\d{1,2}[\/-]\d{1,2}([\/-]\d{2,4})?)$/i.test(t)

/** "Matemática 15/11 08:00 álgebra" → { materia, cuando, tema } o null */
function leerExamen(args) {
  const i = args.findIndex(esDia)
  if (i < 1) return null
  const materia = args.slice(0, i).join(' ').trim()
  let hora = '08:00'
  let finTema = i + 1
  if (escuela.horaValida(args[i + 1])) { hora = escuela.horaValida(args[i + 1]); finTema = i + 2 }
  const cuando = interpretarFecha(`${args[i]} ${hora}`)
  if (!materia || !cuando) return null
  return { materia: materia.slice(0, 40), cuando, tema: args.slice(finTema).join(' ').slice(0, 120) }
}

function crearAvisos({ idBot, numero, jid = `${numero}@s.whatsapp.net`, examen, ahora = Date.now() }) {
  const ids = [] // los avisos van a su privado
  for (const [antes, etiqueta] of [[DIA_MS, 'mañana'], [3600000, 'en 1 hora']]) {
    const cuando = examen.cuando.getTime() - antes
    if (cuando <= ahora) continue
    try {
      const r = recordatorios.crear({ idBot, jid, numero, texto: `📖 Examen de *${examen.materia}* ${etiqueta}${examen.tema ? ` (${examen.tema})` : ''}. ¡Éxitos!`, cuando })
      ids.push(r.id)
    } catch { /* límite de recordatorios: el examen igual se guarda */ }
  }
  return ids
}

module.exports = {
  name: 'misexamenes',
  aliases: ['agendaexamen', 'proximosexamenes'],
  description: 'Tus exámenes con cuenta regresiva y aviso un día y una hora antes',
  category: 'escuela',

  async execute(sock, msg, args, { config, esSubBot, subbotNumero }) {
    const jid = msg.key.remoteJid
    const P = config.PREFIXES[0]
    const responder = (text) => sock.sendMessage(jid, { text }, { quoted: msg })
    const numero = escuela.numeroUsuario(msg)
    const idBot = esSubBot ? String(subbotNumero) : 'principal'
    const datos = escuela.abrir(numero)
    const accion = (args[0] || '').toLowerCase()

    // Quita los que pasaron hace más de un día
    const antes = datos.ficha.examenes.length
    datos.ficha.examenes = datos.ficha.examenes.filter((e) => e.cuando > Date.now() - DIA_MS)
    if (datos.ficha.examenes.length !== antes) datos.guardar()
    const examenes = datos.ficha.examenes.sort((a, b) => a.cuando - b.cuando)

    if (['add', 'agregar', 'nuevo'].includes(accion)) {
      const leido = leerExamen(args.slice(1))
      if (!leido) return responder(`❌ No entendí.\n\n📌 Ejemplo: ${P}misexamenes add Matemática 15/11 08:00 Álgebra\n(la hora y el tema son opcionales; también "mañana" o "hoy")`)
      if (leido.cuando.getTime() < Date.now()) return responder('❌ Esa fecha ya pasó.')
      if (examenes.length >= escuela.LIMITES.examenes) return responder(`❌ Máximo ${escuela.LIMITES.examenes} exámenes. Borra alguno.`)
      const avisos = crearAvisos({ idBot, numero, jid: jidPrivado(msg, sock), examen: leido })
      examenes.push({ id: datos.id(), materia: leido.materia, cuando: leido.cuando.getTime(), tema: leido.tema, avisos })
      datos.guardar()
      return responder(caja('📖', 'Examen agendado', [
        ['Materia', leido.materia, '📚'],
        ['Fecha', formatearFechaPeru(leido.cuando), '📅'],
        leido.tema ? ['Tema', leido.tema, '📝'] : null,
        ['Faltan', describirDuracion(leido.cuando.getTime() - Date.now()), '⏳'],
      ], avisos.length ? `Te avisaré por privado ${avisos.length === 2 ? 'un día y una hora antes' : 'antes del examen'} 🔔` : 'Quedan menos de 1 hora: sin aviso previo'))
    }

    if (['borrar', 'eliminar', 'del'].includes(accion)) {
      const n = parseInt(args[1], 10)
      if (!n || n < 1 || n > examenes.length) return responder(`❌ Indica el número (mira ${P}misexamenes).`)
      const [quitado] = examenes.splice(n - 1, 1)
      for (const id of quitado.avisos || []) recordatorios.borrar(numero, id)
      datos.ficha.examenes = examenes
      datos.guardar()
      return responder(`🗑️ Examen de *${quitado.materia}* eliminado (y sus avisos).`)
    }

    if (!examenes.length) {
      return responder(caja('📖', 'Mis exámenes', [
        `➕ ${P}misexamenes add Matemática 15/11 08:00 Álgebra`,
        `🗑️ ${P}misexamenes borrar <n>`,
      ], 'No tienes exámenes agendados'))
    }
    const ahora = Date.now()
    const filas = examenes.map((e, i) => {
      const falta = e.cuando - ahora
      const urgente = falta < 2 * DIA_MS ? '🔴' : falta < 7 * DIA_MS ? '🟡' : '🟢'
      return `${urgente} ${i + 1}. *${e.materia}* — ${formatearFechaPeru(new Date(e.cuando))}${e.tema ? `\n     📝 ${e.tema}` : ''}\n     ⏳ ${falta > 0 ? `faltan ${describirDuracion(falta)}` : 'es hoy / ya empezó'}`
    })
    return responder(caja('📖', 'Mis exámenes', filas, '🔴 menos de 2 días · 🟡 menos de 1 semana'))
  },
  _internos: { leerExamen, crearAvisos },
}
