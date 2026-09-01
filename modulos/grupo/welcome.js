//CÓDIGO ORIGINAL DE YUIBOT-MD
const { generarImagenBienvenida } = require('../../lib/welcome')

module.exports = {
  name: 'welcome',
  aliases: ['bienvenida', 'testwelcome'],
  description: 'Prueba o activa manualmente el mensaje de bienvenida',
  category: 'grupo',

  async execute(sock, msg, args, { config }) {
    const jid = msg.key.remoteJid

    if (!jid.endsWith('@g.us')) {
      return sock.sendMessage(jid, { text: '❌ Este comando solo funciona en grupos.' }, { quoted: msg })
    }

    let metadata
    try {
      metadata = await sock.groupMetadata(jid)
    } catch (error) {
      console.error('[WELCOME-CMD]', error)
      return sock.sendMessage(jid, { text: '❌ No se pudo obtener la información del grupo.' }, { quoted: msg })
    }

    const remitente = msg.key.participantAlt || msg.key.participant || jid
    const numero = remitente.split('@')[0].split(':')[0]

    let username = numero
    try {
      const [info] = await sock.onWhatsApp(remitente)
      username = info?.notify || numero
    } catch {
      // si falla, se usa el número tal cual
    }

    let avatar = 'https://i.imgur.com/8Km9tLL.png'
    try {
      avatar = await sock.profilePictureUrl(remitente, 'image')
    } catch {
      // sin foto de perfil pública, se usa el ícono de respaldo
    }

    await sock.sendMessage(jid, { text: '⏳ Generando imagen de bienvenida de prueba...' }, { quoted: msg })

    try {
      const imagen = await generarImagenBienvenida({
        username,
        guildName: metadata.subject,
        memberCount: metadata.participants.length,
        avatar,
        background: config.WELCOME_BACKGROUND,
        botName: config.BOT_NAME,
      })

      await sock.sendMessage(
        jid,
        {
          image: imagen,
          caption: `🥀 Esta es una prueba — así se vería tu bienvenida, @${numero}`,
          mentions: [remitente],
        },
        { quoted: msg }
      )
    } catch (error) {
      console.error('[WELCOME-CMD]', error)
      await sock.sendMessage(
        jid,
        { text: `❌ No se pudo generar la imagen.\n\n> ${error.message || 'Error desconocido'}` },
        { quoted: msg }
      )
    }
  },
}