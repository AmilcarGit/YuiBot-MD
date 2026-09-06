//CÓDIGO ORIGINAL DE YUIBOT-MD
const { obtenerUsuario } = require('../../lib/db')
const { generarTarjetaPerfil } = require('../../lib/perfilCard')

module.exports = {
  name: 'perfil',
  aliases: ['profile'],
  description: 'Muestra tu perfil o el de alguien citado',
  category: 'usuario',

  async execute(sock, msg, args, { config }) {
    const jid = msg.key.remoteJid
    const prefijo = config.PREFIXES[0]

    const citadoJid = msg.message?.extendedTextMessage?.contextInfo?.participant
    const mencionJid = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0]
    const remitentePropio = msg.key.participantAlt || msg.key.participant || jid

    const objetivoJid = citadoJid || mencionJid || remitentePropio
    const numero = objetivoJid.split('@')[0].split(':')[0]

    const datos = obtenerUsuario(numero)

    let avatar = 'https://i.imgur.com/8Km9tLL.png'
    try {
      avatar = await sock.profilePictureUrl(objetivoJid, 'image')
    } catch {
      // sin foto de perfil pública, se usa la imagen de respaldo
    }

    try {
      const imagen = await generarTarjetaPerfil({
        numero,
        nombre: datos?.nombre || 'Sin registrar',
        genero: datos?.genero || null,
        edad: datos?.edad || null,
        avatar,
        background: config.PROFILE_BACKGROUND,
        botName: config.BOT_NAME,
      })

      const caption = datos
        ? `⛧───「 Perfil 」───⛧\n\n_${prefijo}reg para actualizar tus datos_`
        : `⛧───「 Perfil 」───⛧\n\n_Sin registrar — usa ${prefijo}reg para registrarte_`

      await sock.sendMessage(jid, { image: imagen, caption }, { quoted: msg })
    } catch (error) {
      console.error('[PERFIL]', error)
      await sock.sendMessage(
        jid,
        { text: `❌ No se pudo generar tu perfil.\n\n> ${error.message || 'Error desconocido'}` },
        { quoted: msg }
      )
    }
  },
}