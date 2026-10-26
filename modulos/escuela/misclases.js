// .misclases — horario semanal de clases.
const { caja } = require('../../lib/estilo')
const escuela = require('../../lib/escuela')

const ordenar = (lista) => [...lista].sort((a, b) => a.dia - b.dia || a.inicio.localeCompare(b.inicio))
const lineaClase = (c) => `🕒 ${c.inicio}${c.fin ? `–${c.fin}` : ''}  *${c.materia}*${c.aula ? ` (${c.aula})` : ''}`

function mostrarDia(clases, dia, titulo) {
  const del = ordenar(clases.filter((c) => c.dia === dia))
  return caja('🏫', titulo, del.length ? del.map(lineaClase) : ['Sin clases 🎉'], escuela.DIAS[dia])
}

module.exports = {
  name: 'misclases',
  aliases: ['horarioescolar', 'miclase'],
  description: 'Tu horario de clases: misclases add lunes 08:00-09:30 Mate',
  category: 'escuela',

  async execute(sock, msg, args, { config }) {
    const jid = msg.key.remoteJid
    const P = config.PREFIXES[0]
    const responder = (text) => sock.sendMessage(jid, { text }, { quoted: msg })
    const datos = escuela.abrir(escuela.numeroUsuario(msg))
    const clases = datos.ficha.horario
    const accion = (args[0] || '').toLowerCase()

    if (['add', 'agregar', 'nueva'].includes(accion)) {
      const dia = escuela.diaDe(args[1])
      const rango = escuela.rangoHora(args[2])
      const resto = args.slice(3).join(' ').trim()
      if (dia === null || !rango || !resto) {
        return responder(`❌ Faltan datos.\n\n📌 Ejemplo: ${P}misclases add lunes 08:00-09:30 Matemática 3B\n(El texto final es la materia y, si quieres, el aula)`)
      }
      if (clases.length >= escuela.LIMITES.horario) return responder(`❌ Máximo ${escuela.LIMITES.horario} clases. Borra alguna.`)
      const choque = clases.find((c) => c.dia === dia && c.inicio === rango.inicio)
      if (choque) return responder(`⚠️ Ya tienes *${choque.materia}* el ${escuela.DIAS[dia]} a las ${choque.inicio}.`)
      clases.push({ dia, inicio: rango.inicio, fin: rango.fin, materia: resto.slice(0, 40), aula: null })
      datos.guardar()
      return responder(`✅ Agregado: ${escuela.DIAS[dia]} ${rango.inicio}${rango.fin ? `–${rango.fin}` : ''} — *${resto}*`)
    }

    if (['borrar', 'eliminar', 'del'].includes(accion)) {
      const orden = ordenar(clases)
      const n = parseInt(args[1], 10)
      if (!n || n < 1 || n > orden.length) return responder(`❌ Indica el número (mira ${P}misclases todo).`)
      clases.splice(clases.indexOf(orden[n - 1]), 1)
      datos.guardar()
      return responder(`🗑️ Quitada: *${orden[n - 1].materia}* (${escuela.DIAS[orden[n - 1].dia]} ${orden[n - 1].inicio}).`)
    }

    if (accion === 'limpiar') {
      datos.ficha.horario = []
      datos.guardar()
      return responder('🧹 Horario borrado.')
    }

    if (!clases.length) {
      return responder(caja('🏫', 'Mi horario', [
        `➕ ${P}misclases add lunes 08:00-09:30 Matemática`,
        `📅 ${P}misclases hoy · mañana · todo`,
        `🗑️ ${P}misclases borrar <n>`,
      ], 'Aún no tienes clases guardadas'))
    }

    if (accion === 'hoy') return responder(mostrarDia(clases, escuela.diaHoy(), 'Clases de hoy'))
    if (['manana', 'mañana'].includes(accion)) return responder(mostrarDia(clases, escuela.diaHoy(Date.now(), 1), 'Clases de mañana'))
    const dia = escuela.diaDe(accion)
    if (dia !== null) return responder(mostrarDia(clases, dia, `Clases del ${escuela.DIAS[dia]}`))

    // Semana completa, numerada para poder borrar
    const orden = ordenar(clases)
    let ultimo = -1
    const filas = []
    orden.forEach((c, i) => {
      if (c.dia !== ultimo) { filas.push(`*${escuela.DIAS[c.dia].toUpperCase()}*`); ultimo = c.dia }
      filas.push(`${i + 1}. ${lineaClase(c)}`)
    })
    return responder(caja('🏫', 'Mi horario', filas, `${clases.length} clase(s) · ${P}misclases hoy`))
  },
  _internos: { ordenar },
}
