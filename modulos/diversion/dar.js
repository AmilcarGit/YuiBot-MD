//CÓDIGO ORIGINAL DE YUIBOT-MD
const { obtenerUsuario, agregarMonedas } = require('../../lib/db')

module.exports = {
  name: 'dar',
  aliases: ['pay', 'transferir'],
  description: 'Regala monedas a otro usuario (cita o menciona)',
  category: 'diversion',

  async execute(sock, msg, args, { config }) {
    const jid = msg.key.remoteJid
    const prefijo = config.PREFIXES[0]

    const remitente = msg.key.participantAlt || msg.key.participant || jid
    const numeroRemitente = remitente.split('@')[0].split(':')[0]

    const citadoJid = msg.message?.extendedTextMessage?.contextInfo?.participant
    const mencionJid = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0]
    const objetivoJid = citadoJid || mencionJid

    if (!objetivoJid) {
      return sock.sendMessage(
        jid,
        { text: `❌ Cita o menciona a quién le quieres dar monedas.\n📌 Ejemplo: ${prefijo}dar 50 (citando su mensaje)` },
        { quoted: msg }
      )
    }

    const numeroObjetivo = objetivoJid.split('@')[0].split(':')[0]

    if (numeroObjetivo === numeroRemitente) {
      return sock.sendMessage(jid, { text: '❌ No puedes darte monedas a ti mismo.' }, { quoted: msg })
    }

    const cantidad = parseInt(args[0], 10)

    if (!cantidad || cantidad <= 0) {
      return sock.sendMessage(
        jid,
        { text: `❌ Escribe una cantidad válida.\n📌 Ejemplo: ${prefijo}dar 50 (citando su mensaje)` },
        { quoted: msg }
      )
    }

    const datosRemitente = obtenerUsuario(numeroRemitente)
    const balanceActual = datosRemitente?.monedas || 0

    if (balanceActual < cantidad) {
      return sock.sendMessage(
        jid,
        { text: `❌ No tienes suficientes monedas. Tu balance es ${balanceActual}.` },
        { quoted: msg }
      )
    }

    agregarMonedas(numeroRemitente, -cantidad)
    agregarMonedas(numeroObjetivo, cantidad)

    await sock.sendMessage(
      jid,
      {
        text: `✅ @${numeroRemitente} le dio *${cantidad}* monedas a @${numeroObjetivo}.`,
        mentions: [remitente, objetivoJid],
      },
      { quoted: msg }
    )
  },
}