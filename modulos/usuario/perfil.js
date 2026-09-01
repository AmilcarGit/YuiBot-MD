//CÓDIGO ORIGINAL DE YUIBOT-MD
const { obtenerUsuario } = require('../../lib/db')

module.exports = {
  name: 'perfil',
  aliases: ['profile', 'p'],
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

    let texto = `⛧───「 Perfil 」───⛧\n\n`
    texto += `  ❖ número: +${numero}\n`

    if (datos) {
      texto += `  ❖ nombre: ${datos.nombre}\n`
      texto += `  ❖ edad: ${datos.edad}\n`
    } else {
      texto += `  ❖ nombre: sin registrar\n`
      texto += `\n_Usa ${prefijo}reg Nombre, Edad para registrarte._`
    }

    texto += `\n\n╰─➤ _${config.BOT_NAME}_ 🥀`

    let fotoUrl = null
    try {
      fotoUrl = await sock.profilePictureUrl(objetivoJid, 'image')
    } catch {
      fotoUrl = null
    }

    if (fotoUrl) {
      try {
        const resp = await fetch(fotoUrl)
        const buffer = Buffer.from(await resp.arrayBuffer())
        await sock.sendMessage(jid, { image: buffer, caption: texto }, { quoted: msg })
        return
      } catch (error) {
        console.error('[PERFIL] No se pudo descargar la foto, se envía solo texto:', error)
      }
    }

    await sock.sendMessage(jid, { text: texto + '\n\n_(sin foto de perfil pública)_' }, { quoted: msg })
  },
}