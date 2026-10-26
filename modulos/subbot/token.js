//CÓDIGO ORIGINAL DE YUIBOT-MD
const { caja } = require('../../lib/estilo')
const { darToken, soltarToken, obtenerTokenActual } = require('../../lib/premium')

module.exports = {
  name: 'token',
  aliases: ['premiumtoken'],
  description: 'Da o suelta el token premium para subbots',
  category: 'subbot',
  ownerOnly: true,

  async execute(sock, msg, args, { config }) {
    const jid = msg.key.remoteJid
    const prefijo = config.PREFIXES[0]
    const accion = (args[0] || '').toLowerCase()

    if (accion === 'dar') {
      const token = darToken()
      return sock.sendMessage(
        jid,
        {
          text:
            caja('💎', 'Token premium', ['Nuevo token generado.', 'Compártelo con quien quieras dar permisos premium.'], 'Para usarlo al crear su subbot:') +
            `\n\n${prefijo}code <numero> ${token}`
        },
        { quoted: msg }
      )
    }

    if (accion === 'soltar') {
      soltarToken()
      return sock.sendMessage(jid, { text: '✅ Token premium revocado. Ya no se puede usar para nuevos subbots.' }, { quoted: msg })
    }

    const actual = obtenerTokenActual()
    await sock.sendMessage(
      jid,
      {
        text:
          actual
            ? caja('💎', 'Token premium', ['Token activo:'], `${prefijo}token soltar — para revocarlo | ${prefijo}token dar — para generar uno nuevo`) + `\n\n${actual}`
            : `📭 No hay ningún token premium activo.\n\n📌 ${prefijo}token dar — para generar uno`
      },
      { quoted: msg }
    )
  },
}