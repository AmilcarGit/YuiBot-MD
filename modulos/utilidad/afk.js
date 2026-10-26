// .afk [motivo] — marca que estás ausente; avisa a quien te mencione.
const E = require('../../lib/estilo')
const afk = require('../../lib/afk')

module.exports = {
  name: 'afk',
  aliases: ['ausente'],
  description: 'Te marca ausente y avisa a quien te mencione en grupos',
  category: 'utilidad',

  async execute(sock, msg, args) {
    const jid = msg.key.remoteJid
    const remitente = msg.key.participantAlt || msg.key.participant || jid
    const numero = remitente.split('@')[0].split(':')[0]
    afk.activar(numero, args.join(' '))
    return sock.sendMessage(jid, { text: E.caja('💤', 'AFK', [['Estado', 'Ausente'], args.length ? ['Motivo', args.join(' ')] : null, 'Volverás automáticamente al escribir.'], 'Te avisaré si alguien te menciona') }, { quoted: msg })
  },

  async onMessage(sock, msg, ctx) {
    return afk.aplicar(sock, msg, ctx)
  },
}
