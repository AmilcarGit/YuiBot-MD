//CÓDIGO ORIGINAL DE YUIBOT-MD
const tickets = require('../../lib/tickets')

module.exports = {
  name: 'ticket',
  aliases: ['tickets', 'soporte'],
  description: 'Crea un ticket de soporte para el owner, o gestiona los existentes',
  category: 'sistema',

  async execute(sock, msg, args, { config }) {
    const jid = msg.key.remoteJid
    const remitente = msg.key.participantAlt || msg.key.participant || jid
    const numeroRemitente = remitente.split('@')[0].split(':')[0]
    const esOwnerBot = config.OWNERS.some((o) => o.numero === numeroRemitente)

    const accion = (args[0] || '').toLowerCase()

    // --- Acciones de owner ---
    if (esOwnerBot && (accion === 'cerrar' || accion === 'close') && args[1]) {
      const ticket = tickets.cerrar(args[1])
      if (!ticket) return sock.sendMessage(jid, { text: `❌ No existe el ticket #${args[1]}.` }, { quoted: msg })
      return sock.sendMessage(jid, { text: `✅ Ticket #${ticket.id} cerrado.` }, { quoted: msg })
    }

    if (esOwnerBot && (accion === 'ver' || accion === 'view') && args[1]) {
      const ticket = tickets.obtener(args[1])
      if (!ticket) return sock.sendMessage(jid, { text: `❌ No existe el ticket #${args[1]}.` }, { quoted: msg })
      return sock.sendMessage(jid, {
        text: `🎫 *TICKET #${ticket.id}*\n\nDe: +${ticket.numero}\nEstado: *${ticket.estado}*\nCreado: ${new Date(ticket.creadoEn).toLocaleString('es-PE')}\n\n${ticket.asunto}`,
      }, { quoted: msg })
    }

    if (esOwnerBot && (accion === 'list' || accion === 'lista' || accion === 'abiertos')) {
      const abiertos = tickets.listar('abierto')
      if (!abiertos.length) return sock.sendMessage(jid, { text: '✅ No hay tickets abiertos.' }, { quoted: msg })

      const texto = abiertos.map((t) => `#${t.id} — +${t.numero}\n${t.asunto.slice(0, 60)}${t.asunto.length > 60 ? '…' : ''}`).join('\n\n')
      return sock.sendMessage(jid, { text: `🎫 *TICKETS ABIERTOS (${abiertos.length})*\n\n${texto}\n\nUsa: ticket ver <id> / ticket cerrar <id>` }, { quoted: msg })
    }

    // --- Crear ticket (cualquier usuario) ---
    const asunto = args.join(' ').trim()
    if (!asunto) {
      const ayuda = esOwnerBot
        ? '📋 *Uso:*\n• ticket <mensaje> — crear uno\n• ticket lista — ver abiertos\n• ticket ver <id>\n• ticket cerrar <id>'
        : '⚠️ Escribe tu mensaje de soporte.\nEjemplo: ticket El bot no me responde en mi grupo'
      return sock.sendMessage(jid, { text: ayuda }, { quoted: msg })
    }

    const ticket = tickets.crear({ numero: numeroRemitente, jidOrigen: jid, asunto })

    for (const owner of config.OWNERS) {
      try {
        await sock.sendMessage(`${owner.numero}@s.whatsapp.net`, {
          text: `🎫 *NUEVO TICKET #${ticket.id}*\n\nDe: +${numeroRemitente}\n\n${asunto}`,
        })
      } catch (error) {
        console.error('[TICKETS] No se pudo notificar al owner:', owner.numero, error)
      }
    }

    return sock.sendMessage(jid, { text: `✅ Ticket #${ticket.id} creado. El owner fue notificado.` }, { quoted: msg })
  },
}