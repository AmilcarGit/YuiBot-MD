//CÓDIGO ORIGINAL DE YUIBOT-MD
const { esAdminDeGrupo } = require('../../lib/moderacion')
const votacionLib = require('../../lib/votacion')

function formatearResultado({ pregunta, opciones, conteo, totalVotos }) {
  const maximo = Math.max(...conteo, 1)
  const lineas = opciones.map((opcion, i) => {
    const votos = conteo[i]
    const porcentaje = totalVotos ? Math.round((votos / totalVotos) * 100) : 0
    const barras = '█'.repeat(Math.round((votos / maximo) * 10))
    return `${i + 1}. ${opcion}\n   ${barras || '·'} ${votos} voto(s) (${porcentaje}%)`
  })

  return `📊 *${pregunta}*\n\n${lineas.join('\n\n')}\n\nTotal de votos: *${totalVotos}*`
}

module.exports = {
  name: 'votacion',
  aliases: ['encuesta', 'poll'],
  description: 'Crea una votación/encuesta en el grupo',
  category: 'grupo',

  async execute(sock, msg, args, { config }) {
    const jid = msg.key.remoteJid
    if (!jid.endsWith('@g.us')) {
      return sock.sendMessage(jid, { text: '❌ Este comando solo funciona en grupos.' }, { quoted: msg })
    }

    const remitente = msg.key.participantAlt || msg.key.participant || jid
    const numeroRemitente = remitente.split('@')[0].split(':')[0]
    const accion = (args[0] || '').toLowerCase()

    if (accion === 'votar') {
      const indice = Number(args[1]) - 1
      if (Number.isNaN(indice)) {
        return sock.sendMessage(jid, { text: '⚠️ Usa: votacion votar <número de opción>' }, { quoted: msg })
      }
      const resultado = votacionLib.votar(jid, numeroRemitente, indice)
      if (!resultado.ok) {
        const texto = resultado.motivo === 'sin_votacion'
          ? 'ℹ️ No hay ninguna votación activa en este grupo.'
          : '⚠️ Esa opción no existe. Revisa el número con *votacion* (sin argumentos).'
        return sock.sendMessage(jid, { text: texto }, { quoted: msg })
      }
      return sock.sendMessage(jid, { text: '✅ ¡Voto registrado! (puedes cambiarlo votando de nuevo)' }, { quoted: msg })
    }

    if (!accion || accion === 'resultados' || accion === 'ver') {
      const votacion = votacionLib.obtener(jid)
      if (!votacion) {
        return sock.sendMessage(jid, {
          text: 'ℹ️ No hay ninguna votación activa.\n\nUn admin puede crear una con:\nvotacion crear <pregunta> | <opción 1> | <opción 2> | ...',
        }, { quoted: msg })
      }
      const conteo = votacionLib.contarVotos(votacion)
      const totalVotos = Object.keys(votacion.votos || {}).length
      return sock.sendMessage(jid, {
        text: formatearResultado({ pregunta: votacion.pregunta, opciones: votacion.opciones, conteo, totalVotos }) + '\n\nVota con: *votacion votar <número>*',
      }, { quoted: msg })
    }

    // A partir de acá, "crear" y "cerrar"/"cancelar" requieren admin/owner.
    let metadata
    try {
      metadata = await sock.groupMetadata(jid)
    } catch (error) {
      return sock.sendMessage(jid, { text: '❌ No se pudo obtener la información del grupo.' }, { quoted: msg })
    }
    const esAdmin = esAdminDeGrupo(metadata, numeroRemitente)
    const esOwnerBot = config.OWNERS.some((o) => o.numero === numeroRemitente)
    if (!esAdmin && !esOwnerBot) {
      return sock.sendMessage(jid, { text: '⛔ Solo los administradores pueden crear/cerrar votaciones. Usa *votacion votar <número>* para participar.' }, { quoted: msg })
    }

    if (accion === 'cancelar') {
      votacionLib.cancelar(jid)
      return sock.sendMessage(jid, { text: '✅ Votación cancelada sin mostrar resultados.' }, { quoted: msg })
    }

    if (accion === 'cerrar') {
      const resultado = votacionLib.cerrar(jid)
      if (!resultado) {
        return sock.sendMessage(jid, { text: 'ℹ️ No hay ninguna votación activa.' }, { quoted: msg })
      }
      return sock.sendMessage(jid, { text: `🔒 *VOTACIÓN CERRADA*\n\n${formatearResultado(resultado)}` }, { quoted: msg })
    }

    if (accion === 'crear') {
      const resto = args.slice(1).join(' ')
      const partes = resto.split('|').map((p) => p.trim()).filter(Boolean)

      if (partes.length < 3) {
        return sock.sendMessage(jid, {
          text: '⚠️ Formato: votacion crear <pregunta> | <opción 1> | <opción 2> | ...\n(mínimo 2 opciones)\n\nEjemplo:\nvotacion crear ¿Qué película vemos? | Terror | Comedia | Acción',
        }, { quoted: msg })
      }

      if (votacionLib.obtener(jid)) {
        return sock.sendMessage(jid, { text: '⚠️ Ya hay una votación activa. Ciérrala primero con *votacion cerrar*.' }, { quoted: msg })
      }

      const [pregunta, ...opciones] = partes
      votacionLib.crear(jid, { pregunta, opciones, creadoPor: numeroRemitente })

      const listaOpciones = opciones.map((op, i) => `${i + 1}. ${op}`).join('\n')
      return sock.sendMessage(jid, {
        text: `📊 *NUEVA VOTACIÓN*\n\n${pregunta}\n\n${listaOpciones}\n\nVota con: *votacion votar <número>*`,
      }, { quoted: msg })
    }

    return sock.sendMessage(jid, {
      text: '📋 *Uso:*\n• votacion crear <pregunta> | <op1> | <op2>...\n• votacion votar <número>\n• votacion resultados\n• votacion cerrar\n• votacion cancelar',
    }, { quoted: msg })
  },
}