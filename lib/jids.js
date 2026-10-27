// JID correcto para escribirle por privado a quien envió un mensaje.
// En grupos WhatsApp puede identificar a la persona con un LID (un número
// largo que NO es su teléfono): fabricar "<número>@s.whatsapp.net" a partir de
// él no llega a nadie. Se usa el JID real que trae el mensaje.
const limpiarDispositivo = (jid) => String(jid || '').replace(/:\d+@/, '@')

function jidPrivado(msg, sock) {
  const k = msg?.key || {}
  if (k.fromMe && sock?.user?.id) return limpiarDispositivo(sock.user.id) // el propio número del bot
  if (k.participantAlt && /@s\.whatsapp\.net$/.test(k.participantAlt)) return limpiarDispositivo(k.participantAlt)
  if (k.participant) return limpiarDispositivo(k.participant)
  return limpiarDispositivo(k.remoteJid)
}

module.exports = { jidPrivado, limpiarDispositivo }
