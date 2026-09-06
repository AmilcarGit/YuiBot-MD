//CÓDIGO ORIGINAL DE YUIBOT-MD
module.exports = {
  name: 'info',
  aliases: [],
  description: 'Información del usuario y del chat',
  category: 'utilidad',
  async execute(sock, msg, args, { config }) {
    const jid = msg.key.remoteJid
    const grupo = jid.endsWith('@g.us')
    const contexto = msg.message?.extendedTextMessage?.contextInfo
    const mencionado = contexto?.mentionedJid?.[0]
    const usuarioJid = mencionado || msg.key.participantAlt || msg.key.participant || jid
    const numero = usuarioJid.split('@')[0].split(':')[0]
    let nombre = msg.pushName || 'Usuario'
    let grupoNombre = 'Chat privado'
    let participantes = null

    if (grupo) {
      try {
        const metadata = await sock.groupMetadata(jid)
        grupoNombre = metadata.subject || 'Grupo'
        participantes = metadata.participants?.length || 0
      } catch {}
    }

    if (mencionado) {
      try {
        const [contacto] = await sock.onWhatsApp(mencionado)
        nombre = contacto?.notify || numero
      } catch {
        nombre = numero
      }
    }

    const lineas = [
      `👤 Nombre: *${nombre}*`,
      `📱 Número: *${numero}*`,
      `🆔 JID: *${usuarioJid}*`,
      `💬 Tipo: *${grupo ? 'Grupo' : 'Privado'}*`,
    ]

    if (grupo) {
      lineas.push(`👥 Grupo: *${grupoNombre}*`, `👨‍👩‍👧‍👦 Miembros: *${participantes}*`, `🆔 JID del grupo: *${jid}*`)
    }

    lineas.push(`🤖 Bot: *${config.BOT_NAME}*`)
    await sock.sendMessage(jid, { text: `╭─ ✦ 👤 INFO ✦\n│ ${lineas.join('\n│ ')}\n╰─ 🍃 YuiBot-MD` }, { quoted: msg })
  },
}