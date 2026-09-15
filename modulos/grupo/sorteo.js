//CÓDIGO ORIGINAL DE YUIBOT-MD
const { esAdminDeGrupo } = require('../../lib/moderacion')
const sorteoLib = require('../../lib/sorteo')

// ⚠️ Estos timers viven en memoria: si el bot se reinicia mientras un
// sorteo está activo, el sorteo sigue guardado en data/sorteo.json pero
// NO se anunciará solo al cumplirse el tiempo — hay que cerrarlo a mano
// con "sorteo terminar". Aceptable por ahora; se puede mejorar más
// adelante reprogramando los timers pendientes al iniciar el bot.
const timers = new Map()

function programarFin(sock, jid, delayMs) {
  clearTimeout(timers.get(jid))
  const timer = setTimeout(async () => {
    await anunciarGanador(sock, jid)
    timers.delete(jid)
  }, Math.max(1000, delayMs))
  timer.unref?.()
  timers.set(jid, timer)
}

async function anunciarGanador(sock, jid) {
  const resultado = sorteoLib.finalizar(jid)
  if (!resultado) return

  if (!resultado.ganador) {
    await sock.sendMessage(jid, {
      text: `🎉 *SORTEO FINALIZADO*\n\nPremio: *${resultado.premio}*\n\nNadie participó, no hay ganador esta vez.`,
    })
    return
  }

  await sock.sendMessage(jid, {
    text: `🎉 *SORTEO FINALIZADO*\n\nPremio: *${resultado.premio}*\nParticipantes: *${resultado.participantes.length}*\n\n🏆 Ganador: @${resultado.ganador}`,
    mentions: [`${resultado.ganador}@s.whatsapp.net`],
  })
}

module.exports = {
  name: 'sorteo',
  aliases: ['giveaway', 'rifa'],
  description: 'Inicia un sorteo en el grupo con premio y duración',
  category: 'grupo',

  async execute(sock, msg, args, { config }) {
    const jid = msg.key.remoteJid
    if (!jid.endsWith('@g.us')) {
      return sock.sendMessage(jid, { text: '❌ Este comando solo funciona en grupos.' }, { quoted: msg })
    }

    const remitente = msg.key.participantAlt || msg.key.participant || jid
    const numeroRemitente = remitente.split('@')[0].split(':')[0]
    const accion = (args[0] || '').toLowerCase()

    if (accion === 'unirme' || accion === 'participar') {
      const resultado = sorteoLib.unirse(jid, numeroRemitente)
      if (!resultado.ok) {
        const texto = resultado.motivo === 'sin_sorteo'
          ? 'ℹ️ No hay ningún sorteo activo en este grupo.'
          : 'ℹ️ Ya estás participando en el sorteo actual.'
        return sock.sendMessage(jid, { text: texto }, { quoted: msg })
      }
      return sock.sendMessage(jid, { text: `✅ Te uniste al sorteo. Participantes: *${resultado.total}*` }, { quoted: msg })
    }

    // A partir de acá, todo requiere admin/owner.
    let metadata
    try {
      metadata = await sock.groupMetadata(jid)
    } catch (error) {
      return sock.sendMessage(jid, { text: '❌ No se pudo obtener la información del grupo.' }, { quoted: msg })
    }
    const esAdmin = esAdminDeGrupo(metadata, numeroRemitente)
    const esOwnerBot = config.OWNERS.some((o) => o.numero === numeroRemitente)
    if (!esAdmin && !esOwnerBot) {
      return sock.sendMessage(jid, { text: '⛔ Solo los administradores pueden iniciar/cancelar sorteos. Usa *sorteo unirme* para participar.' }, { quoted: msg })
    }

    if (accion === 'cancelar') {
      sorteoLib.cancelar(jid)
      clearTimeout(timers.get(jid))
      timers.delete(jid)
      return sock.sendMessage(jid, { text: '✅ Sorteo cancelado.' }, { quoted: msg })
    }

    if (accion === 'terminar') {
      clearTimeout(timers.get(jid))
      timers.delete(jid)
      await anunciarGanador(sock, jid)
      return
    }

    // .sorteo <minutos> <premio...>
    const minutos = Number(args[0])
    const premio = args.slice(1).join(' ').trim()

    if (!minutos || minutos <= 0 || !premio) {
      return sock.sendMessage(jid, {
        text: '📋 *Uso:*\n• sorteo <minutos> <premio> — inicia uno nuevo\n• sorteo unirme — participar\n• sorteo terminar — elige ganador ya\n• sorteo cancelar — cancela sin ganador\n\nEjemplo: sorteo 10 Un mes de premium',
      }, { quoted: msg })
    }

    if (sorteoLib.obtener(jid)) {
      return sock.sendMessage(jid, { text: '⚠️ Ya hay un sorteo activo en este grupo. Cancélalo primero con *sorteo cancelar*.' }, { quoted: msg })
    }

    const duracionMs = minutos * 60 * 1000
    sorteoLib.iniciar(jid, { premio, creadoPor: numeroRemitente, terminaEn: Date.now() + duracionMs })
    programarFin(sock, jid, duracionMs)

    return sock.sendMessage(jid, {
      text: `🎉 *SORTEO INICIADO*\n\nPremio: *${premio}*\nDuración: *${minutos} min*\n\nEscribe *sorteo unirme* para participar.`,
    }, { quoted: msg })
  },
}