//CÓDIGO ORIGINAL DE YUIBOT-MD
const { caja } = require('../../lib/estilo')
const resiliencia = require('../../lib/resiliencia')

module.exports = {
  name: 'resiliencia',
  aliases: ['circuitbreaker', 'cb'],
  description: 'Ver o reactivar comandos autodeshabilitados por fallos repetidos',
  category: 'owner',
  ownerOnly: true,

  async execute(sock, msg, args) {
    const jid = msg.key.remoteJid
    const sub = (args[0] || '').toLowerCase()

    if (sub === 'reset' && args[1]) {
      const ok = resiliencia.reiniciarComando(args[1])
      const texto = ok
        ? `✅ *${args[1]}* fue reactivado manualmente.`
        : `ℹ️ *${args[1]}* no tiene ningún registro de fallos.`
      return sock.sendMessage(jid, { text: texto }, { quoted: msg })
    }

    if (sub === 'on' || sub === 'off') {
      resiliencia.configurar({ enabled: sub === 'on' })
      return sock.sendMessage(jid, { text: `✅ Circuit breaker ${sub === 'on' ? 'activado' : 'desactivado'}.` }, { quoted: msg })
    }

    const estado = resiliencia.obtenerEstado()
    const entradas = Object.entries(estado.comandos || {})
    const ahora = Date.now()
    const bloqueados = entradas.filter(([, info]) => info.deshabilitadoHasta > ahora)

    const filas = [
      ['Estado', estado.enabled ? '🟢 Activado' : '🔴 Desactivado'],
      ['Umbral', `${estado.threshold} fallos en ${Math.round(estado.windowMs / 60000)} min`],
      ['Cooldown', `${Math.round(estado.cooldownMs / 60000)} min`],
    ]
    let pie = 'Ningún comando está deshabilitado ahora mismo.'

    if (bloqueados.length) {
      filas.push(['Deshabilitados', bloqueados.length])
      for (const [nombre, info] of bloqueados) {
        const minutos = Math.max(1, Math.ceil((info.deshabilitadoHasta - ahora) / 60000))
        filas.push(`⛔ *${nombre}* — vuelve en ~${minutos} min. Último error: ${info.ultimoError || 'desconocido'}`)
      }
      pie = 'Usa resiliencia reset <comando> para reactivarlo manualmente.'
    }

    const texto = caja('🛡️', 'Circuit breaker', filas, pie)

    return sock.sendMessage(jid, { text: texto }, { quoted: msg })
  },
}