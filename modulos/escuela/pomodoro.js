// .pomodoro — técnica Pomodoro: enfoque + descanso con avisos automáticos.
const { caja } = require('../../lib/estilo')
const recordatorios = require('../../lib/recordatorios')

const MAX_MIN = 120

module.exports = {
  name: 'pomodoro',
  aliases: ['bloqueestudio'],
  description: 'Timer de estudio: pomodoro [minutos] [descanso] (por defecto 25 y 5)',
  category: 'escuela',

  async execute(sock, msg, args, { config, esSubBot, subbotNumero }) {
    const jid = msg.key.remoteJid
    const P = config.PREFIXES[0]
    const responder = (text) => sock.sendMessage(jid, { text }, { quoted: msg })
    const remitente = msg.key.participantAlt || msg.key.participant || jid
    const numero = remitente.split('@')[0].split(':')[0]
    const idBot = esSubBot ? String(subbotNumero) : 'principal'

    const foco = args[0] === undefined ? 25 : Number(args[0])
    const descanso = args[1] === undefined ? 5 : Number(args[1])
    const valido = (n, min) => Number.isInteger(n) && n >= min && n <= MAX_MIN
    if (!valido(foco, 1) || !valido(descanso, 1)) {
      return responder(`❌ Usa minutos enteros (1 a ${MAX_MIN}).\n\n📌 Ejemplos:\n${P}pomodoro  (25 de estudio y 5 de descanso)\n${P}pomodoro 40 10`)
    }
    try {
      const ahora = Date.now()
      recordatorios.crear({ idBot, jid, numero, texto: `🍅 ¡Terminó tu bloque de estudio! Descansa ${descanso} min: estírate, toma agua 💧`, cuando: ahora + foco * 60000 })
      recordatorios.crear({ idBot, jid, numero, texto: '⏰ ¡Fin del descanso! Vuelve a concentrarte 💪 (usa pomodoro para otro bloque)', cuando: ahora + (foco + descanso) * 60000 })
    } catch (error) {
      return responder(`❌ ${error.message}`)
    }
    return responder(caja('🍅', 'Pomodoro iniciado', [
      ['Estudio', `${foco} min`, '📖'],
      ['Descanso', `${descanso} min`, '☕'],
      'Te avisaré cuando termine cada parte.',
    ], 'Guarda el celular y concéntrate 🔕'))
  },
}
