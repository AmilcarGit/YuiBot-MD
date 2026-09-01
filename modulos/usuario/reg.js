//CÓDIGO ORIGINAL DE YUIBOT-MD
const { guardarUsuario, obtenerUsuario } = require('../../lib/db')

module.exports = {
  name: 'reg',
  aliases: ['registrar', 'register'],
  description: 'Regístrate con tu nombre y edad',
  category: 'usuario',

  async execute(sock, msg, args, { config }) {
    const jid = msg.key.remoteJid
    const remitente = msg.key.participantAlt || msg.key.participant || jid
    const numero = remitente.split('@')[0].split(':')[0]
    const prefijo = config.PREFIXES[0]

    if (!args.length) {
      const yaExiste = obtenerUsuario(numero)
      return sock.sendMessage(
        jid,
        {
          text:
            `❌ Escribe tu nombre y edad separados por coma.\n\n` +
            `📌 Ejemplo: ${prefijo}reg Amilcar, 20\n\n` +
            (yaExiste ? `_Ya estás registrado como ${yaExiste.nombre}, ${yaExiste.edad} años — esto actualiza tus datos._` : '')
        },
        { quoted: msg }
      )
    }

    const texto = args.join(' ')
    const partes = texto.split(',').map((p) => p.trim())

    if (partes.length < 2) {
      return sock.sendMessage(
        jid,
        { text: `❌ Formato incorrecto. Usa: ${prefijo}reg Nombre, Edad\n📌 Ejemplo: ${prefijo}reg Amilcar, 20` },
        { quoted: msg }
      )
    }

    const nombre = partes[0]
    const edad = parseInt(partes[1], 10)

    if (!nombre) {
      return sock.sendMessage(jid, { text: '❌ El nombre no puede estar vacío.' }, { quoted: msg })
    }

    if (isNaN(edad) || edad < 5 || edad > 120) {
      return sock.sendMessage(jid, { text: '❌ La edad debe ser un número válido (entre 5 y 120).' }, { quoted: msg })
    }

    guardarUsuario(numero, { nombre, edad })

    await sock.sendMessage(
      jid,
      {
        text:
          `⛧───「 Registro completo 」───⛧\n\n` +
          `  ❖ nombre: ${nombre}\n` +
          `  ❖ edad: ${edad}\n\n` +
          `╰─➤ _Usa ${prefijo}perfil para ver tu tarjeta_ 🥀`
      },
      { quoted: msg }
    )
  },
}