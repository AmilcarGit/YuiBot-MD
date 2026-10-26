//CÓDIGO ORIGINAL DE YUIBOT-MD
const { caja, espera } = require('../../lib/estilo')
const { reclamarDaily } = require('../../lib/db')

function formatearTiempo(ms) {
  const horas = Math.floor(ms / (1000 * 60 * 60))
  const minutos = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60))
  return `${horas}h ${minutos}m`
}

module.exports = {
  name: 'daily',
  aliases: ['recompensa', 'diario'],
  description: 'Reclama tu recompensa diaria de monedas',
  category: 'diversion',

  async execute(sock, msg, args, { config }) {
    const jid = msg.key.remoteJid
    const remitente = msg.key.participantAlt || msg.key.participant || jid
    const numero = remitente.split('@')[0].split(':')[0]

    const resultado = reclamarDaily(numero, config.ECONOMIA?.DAILY)

    if (!resultado.exito) {
      return sock.sendMessage(
        jid,
        { text: espera(`Ya reclamaste tu recompensa de hoy. Vuelve en *${formatearTiempo(resultado.restanteMs)}*.`) },
        { quoted: msg }
      )
    }

    await sock.sendMessage(
      jid,
      {
        text:
          caja('🎁', 'Recompensa diaria', [
            ['Ganaste', `${resultado.ganado} monedas 💰`],
            ['Balance total', `${resultado.monedas} monedas`],
          ], `Vuelve mañana por más ✨ · ${config.BOT_NAME}`)
      },
      { quoted: msg }
    )
  },
}