const { caja, uso } = require('../../lib/estilo')
const FRASES = [
  [0, '💔 Ni lo intenten...'], [20, '😬 Hay poca química.'], [40, '🤔 Podría funcionar con esfuerzo.'],
  [60, '😊 ¡Hay buena onda!'], [80, '😍 ¡Qué linda pareja!'], [95, '💍 ¡Almas gemelas!'],
]

// Mismo par de personas = mismo porcentaje (no depende del orden).
function compatibilidad(a, b) {
  const clave = [a, b].sort().join('|')
  let hash = 0
  for (const c of clave) hash = (hash * 31 + c.charCodeAt(0)) >>> 0
  return hash % 101
}

function frase(porcentaje) {
  return [...FRASES].reverse().find(([minimo]) => porcentaje >= minimo)[1]
}

function barra(porcentaje) {
  const llenos = Math.round(porcentaje / 10)
  return '❤️'.repeat(llenos) + '🤍'.repeat(10 - llenos)
}

const numeroDe = (jid) => String(jid).split('@')[0].split(':')[0]

module.exports = {
  name: 'ship',
  aliases: ['compatibilidad'],
  description: 'Mide la compatibilidad entre dos personas: .ship @uno @dos',
  category: 'diversion',

  async execute(sock, msg, args, { config }) {
    const jid = msg.key.remoteJid
    const contexto = msg.message?.extendedTextMessage?.contextInfo || {}
    const personas = [...new Set([...(contexto.mentionedJid || []), ...(contexto.participant && !contexto.mentionedJid?.length ? [contexto.participant] : [])])]

    const remitente = msg.key.participant || msg.key.remoteJid
    if (personas.length === 1) personas.unshift(remitente)

    if (personas.length < 2) {
      return sock.sendMessage(jid, { text: uso(config.PREFIXES[0], 'ship', '@uno @dos', 'Menciona a dos personas, o a una para medirte con ella.') }, { quoted: msg })
    }

    const [a, b] = personas
    const porcentaje = compatibilidad(numeroDe(a), numeroDe(b))
    await sock.sendMessage(jid, {
      text: caja('💘', 'Compatibilidad', [`@${numeroDe(a)} ❤️ @${numeroDe(b)}`, barra(porcentaje), ['Afinidad', `${porcentaje}%`], frase(porcentaje)], 'El amor no se mide, pero se intenta ✨'),
      mentions: [a, b],
    }, { quoted: msg })
  },

  _internos: { compatibilidad, frase, barra },
}
