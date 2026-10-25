// .contacto <número> [nombre]  ·  o menciona / responde a alguien
const limpiarNumero = (texto) => String(texto || '').replace(/[^\d]/g, '')

function construirVCard(numero, nombre) {
  const limpio = String(nombre).replace(/[\r\n;]/g, ' ').trim() || `+${numero}`
  return [
    'BEGIN:VCARD',
    'VERSION:3.0',
    `N:;${limpio};;;`,
    `FN:${limpio}`,
    `TEL;type=CELL;type=VOICE;waid=${numero}:+${numero}`,
    'END:VCARD',
  ].join('\n')
}

function resolverObjetivo(msg, args) {
  const contexto = msg.message?.extendedTextMessage?.contextInfo || {}
  const primero = args[0] || ''

  // 1) Un número escrito: +51 999 888 777 (con o sin guiones) o 51999888777
  if (/^\+?\d[\d-]{6,}$/.test(primero)) {
    const numero = limpiarNumero(primero)
    if (numero.length >= 7 && numero.length <= 15) return { numero, nombre: args.slice(1).join(' ').trim() }
  }

  // 2) Una persona mencionada o a la que se responde
  const jidObjetivo = contexto.mentionedJid?.[0] || contexto.participant
  if (jidObjetivo && !jidObjetivo.endsWith('@lid')) {
    const numero = limpiarNumero(jidObjetivo.split('@')[0].split(':')[0])
    if (numero.length >= 7) return { numero, nombre: args.filter((a) => !a.startsWith('@')).join(' ').trim() }
  }
  return null
}

module.exports = {
  name: 'contacto',
  aliases: ['vcard', 'contact'],
  description: 'Envía una tarjeta de contacto: .contacto 51999888777 Juan',
  category: 'utilidad',

  async execute(sock, msg, args, { config }) {
    const jid = msg.key.remoteJid
    const prefijo = config.PREFIXES[0]
    const objetivo = resolverObjetivo(msg, args)

    if (!objetivo || !objetivo.numero) {
      return sock.sendMessage(jid, {
        text: `❌ Indica un número con código de país (sin +) o menciona a alguien.\n\n📌 Ejemplos:\n${prefijo}contacto 51999888777 Juan\n${prefijo}contacto @persona`,
      }, { quoted: msg })
    }

    const nombre = objetivo.nombre || `+${objetivo.numero}`
    await sock.sendMessage(jid, {
      contacts: { displayName: nombre, contacts: [{ displayName: nombre, vcard: construirVCard(objetivo.numero, nombre) }] },
    }, { quoted: msg })
  },

  _internos: { construirVCard, resolverObjetivo },
}
