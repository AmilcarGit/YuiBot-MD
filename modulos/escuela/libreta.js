// .libreta — tus notas por materia con promedios (escala 0–20, aprueba con 11).
const { caja } = require('../../lib/estilo')
const escuela = require('../../lib/escuela')

module.exports = {
  name: 'libreta',
  aliases: ['misnotas', 'notasescolares'],
  description: 'Tus notas y promedios: libreta add Mate 15 · libreta ver',
  category: 'escuela',

  async execute(sock, msg, args, { config }) {
    const jid = msg.key.remoteJid
    const P = config.PREFIXES[0]
    const responder = (text) => sock.sendMessage(jid, { text }, { quoted: msg })
    const datos = escuela.abrir(escuela.numeroUsuario(msg))
    const notas = datos.ficha.notas
    const accion = (args[0] || '').toLowerCase()

    if (['add', 'agregar', 'nota'].includes(accion)) {
      const leida = escuela.leerNota(args[args.length - 1])
      const materia = args.slice(1, -1).join(' ').trim()
      if (!leida || !materia) {
        return responder(`❌ Escribe la materia y la nota (0 a ${escuela.NOTA_MAX}).\n\n📌 Ejemplos:\n${P}libreta add Matemática 15\n${P}libreta add Matemática 14x30  (nota 14 con peso 30%)`)
      }
      if (notas.length >= escuela.LIMITES.notas) return responder('❌ Llegaste al máximo de notas guardadas.')
      notas.push({ id: datos.id(), materia: materia.slice(0, 40), nota: leida.nota, peso: leida.peso, fecha: Date.now() })
      datos.guardar()
      const mia = notas.filter((n) => escuela.sinAcentos(n.materia) === escuela.sinAcentos(materia))
      const prom = escuela.promedio(mia)
      return responder(caja('📝', 'Nota guardada', [
        ['Materia', materia, '📚'],
        ['Nota', `${escuela.fmt(leida.nota)} ${escuela.estadoNota(leida.nota)}`, '🎯'],
        ['Promedio', `${escuela.fmt(prom)} ${escuela.estadoNota(prom)}`, '📊'],
      ], `${mia.length} nota(s) en esta materia`))
    }

    if (['borrar', 'eliminar', 'del'].includes(accion)) {
      const nombre = args.slice(1).join(' ').trim()
      if (!nombre) return responder(`❌ Indica la materia: ${P}libreta borrar Matemática (borra su última nota) o ${P}libreta borrar todo`)
      if (['todo', 'todas'].includes(nombre.toLowerCase())) {
        datos.ficha.notas = []
        datos.guardar()
        return responder('🧹 Borré todas tus notas.')
      }
      const clave = escuela.sinAcentos(nombre)
      let idx = -1
      notas.forEach((n, i) => { if (escuela.sinAcentos(n.materia) === clave) idx = i })
      if (idx === -1) return responder(`❌ No tienes notas de "${nombre}".`)
      const [quitada] = notas.splice(idx, 1)
      datos.guardar()
      return responder(`🗑️ Quité la nota ${escuela.fmt(quitada.nota)} de *${quitada.materia}*.`)
    }

    const resumen = escuela.resumenNotas(notas)
    if (!resumen.materias.length) {
      return responder(caja('📒', 'Mi libreta', [
        `➕ ${P}libreta add Matemática 15`,
        `⚖️ ${P}libreta add Matemática 14x30 (con peso)`,
        `🎯 ${P}notaminima 11 14 12  (¿cuánto necesito?)`,
      ], 'Aún no tienes notas guardadas'))
    }

    const filaMateria = (m) => `${escuela.estadoNota(m.promedio)} *${m.materia}*: ${escuela.fmt(m.promedio)} (${m.cantidad})`
    if (accion && !['ver', 'lista', 'resumen'].includes(accion)) {
      const clave = escuela.sinAcentos(args.join(' '))
      const mias = notas.filter((n) => escuela.sinAcentos(n.materia) === clave)
      if (mias.length) {
        const filas = mias.map((n, i) => `${i + 1}. ${escuela.fmt(n.nota)}${n.peso !== 1 ? ` (peso ${escuela.fmt(n.peso)})` : ''}`)
        return responder(caja('📘', mias[0].materia, filas, `Promedio: ${escuela.fmt(escuela.promedio(mias))}`))
      }
    }
    return responder(caja('📒', 'Mi libreta', [
      ...resumen.materias.map(filaMateria),
      '',
      `📈 *Promedio general:* ${escuela.fmt(resumen.general)} ${escuela.estadoNota(resumen.general)}`,
    ], `Aprueba con ${escuela.NOTA_APROBAR} · ${P}libreta <materia> para el detalle`))
  },
}
