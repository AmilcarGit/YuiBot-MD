//CÓDIGO ORIGINAL DE YUIBOT-MD
const { obtenerUsuario, calcularNivel, xpParaNivel } = require('../../lib/db')
const { generarImagenPerfil } = require('../../lib/welcome')

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
    const nombre = datos?.nombre || numero
    const xp = datos?.xp || 0
    const nivel = datos?.nivel ?? calcularNivel(xp)
    const mensajes = datos?.mensajes || 0
    const xpActualNivel = xpParaNivel(nivel)
    const xpSiguienteNivel = xpParaNivel(nivel + 1)

    let avatar = 'https://i.imgur.com/8Km9tLL.png'
    try {
      avatar = await sock.profilePictureUrl(objetivoJid, 'image')
    } catch (error) {
      console.warn(`[PERFIL] Sin foto de perfil pública para ${numero}, se usa la imagen de respaldo.`)
    }

    try {
      const imagen = await generarImagenPerfil({
        username: nombre,
        numero,
        nivel,
        xp,
        xpActualNivel,
        xpSiguienteNivel,
        mensajes,
        avatar,
        background: config.PROFILE_BACKGROUND || config.WELCOME_BACKGROUND,
        botName: config.BOT_NAME,
      })

      await sock.sendMessage(jid, { image: imagen, caption: `⛧ Perfil de ${nombre} ⛧` }, { quoted: msg })
      return
    } catch (error) {
      console.error('[PERFIL] No se pudo generar la tarjeta, se envía solo texto:', error)
    }

    let texto = `⛧───「 Perfil 」───⛧\n\n`
    texto += `  ❖ número: +${numero}\n`
    texto += `  ❖ nombre: ${nombre}\n`
    texto += `  ❖ nivel: ${nivel}\n`
    texto += `  ❖ xp: ${xp} / ${xpSiguienteNivel}\n`
    texto += `  ❖ mensajes: ${mensajes}\n`

    if (!datos) {
      texto += `\n_Usa ${prefijo}reg Nombre, Edad para registrarte._`
    }

    texto += `\n\n╰─➤ _${config.BOT_NAME}_ 🥀`

    await sock.sendMessage(jid, { text: texto }, { quoted: msg })
  },
}