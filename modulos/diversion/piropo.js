//CÓDIGO ORIGINAL DE YUIBOT-MD
const PIROPOS = [
  'Si fueras un signo de puntuación, serías el punto final de mi búsqueda de alguien perfecto.',
  'No sé qué tienes, pero desde que llegaste todo se ve mejor.',
  'Eres la razón por la que sonrío sin motivo aparente.',
  'Contigo hasta un mensaje de "hola" se siente especial.',
  'Si la belleza fuera delito, tú ya estarías presa/preso de por vida.',
  'Eres como el wifi de mi casa: sin ti no puedo funcionar bien.',
  'Debe ser agotador ser tan increíble todo el tiempo.',
  'Tu sonrisa debería estar prohibida, hace demasiado daño al corazón.',
  'Si existiera un premio a la persona más especial, tú lo ganarías sin competencia.',
  'Contigo cerca, hasta los lunes se sienten mejor.',
  'Eres la prueba de que sí existen las cosas buenas en este mundo.',
  'No necesito suerte teniendo a alguien como tú cerca.',
  'Tu presencia hace que cualquier lugar se sienta como el correcto.',
  'Si las estrellas compitieran contigo, tú seguirías brillando más.',
  'Contigo el tiempo se pasa distinto, mejor.',
]

module.exports = {
  name: 'piropo',
  aliases: ['piropos', 'cumplido'],
  description: 'Envía un piropo aleatorio',
  category: 'diversion',

  async execute(sock, msg, args, { config }) {
    const jid = msg.key.remoteJid
    const citadoJid = msg.message?.extendedTextMessage?.contextInfo?.participant
    const mencionJid = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0]
    const objetivo = citadoJid || mencionJid

    const piropo = PIROPOS[Math.floor(Math.random() * PIROPOS.length)]

    if (objetivo) {
      const numero = objetivo.split('@')[0].split(':')[0]
      await sock.sendMessage(
        jid,
        { text: `💌 @${numero}\n\n_${piropo}_`, mentions: [objetivo] },
        { quoted: msg }
      )
    } else {
      await sock.sendMessage(jid, { text: `💌 _${piropo}_` }, { quoted: msg })
    }
  },
}