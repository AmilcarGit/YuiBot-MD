//CÓDIGO ORIGINAL DE YUIBOT-MD
const { guardarUsuario, obtenerUsuario } = require('../../lib/db')

const TIMEOUT_MS = 60000

function esperarRespuesta(sock, jid, remitenteEsperado) {
  return new Promise((resolve) => {
    const escuchar = (upsert) => {
      const nuevoMsg = upsert.messages?.[0]
      if (!nuevoMsg?.message) return
      if (nuevoMsg.key.remoteJid !== jid) return

      const remitenteNuevo = nuevoMsg.key.participantAlt || nuevoMsg.key.participant || nuevoMsg.key.remoteJid
      if (remitenteNuevo !== remitenteEsperado) return

      const texto = (nuevoMsg.message.conversation || nuevoMsg.message.extendedTextMessage?.text || '').trim()
      if (!texto) return

      sock.ev.off('messages.upsert', escuchar)
      resolve(texto)
    }

    sock.ev.on('messages.upsert', escuchar)
    setTimeout(() => {
      sock.ev.off('messages.upsert', escuchar)
      resolve(null)
    }, TIMEOUT_MS)
  })
}

function normalizarGenero(texto) {
  const t = texto.trim().toLowerCase()
  if (['hombre', 'h', 'masculino', 'm'].includes(t)) return 'Hombre'
  if (['mujer', 'mu', 'femenino', 'f'].includes(t)) return 'Mujer'
  return null
}

module.exports = {
  name: 'reg',
  aliases: ['registrar', 'register'],
  description: 'Regístrate paso a paso: nombre, género y edad',
  category: 'usuario',

  async execute(sock, msg, args, { config }) {
    const jid = msg.key.remoteJid
    const remitente = msg.key.participantAlt || msg.key.participant || jid
    const numero = remitente.split('@')[0].split(':')[0]
    const prefijo = config.PREFIXES[0]

    const yaExiste = obtenerUsuario(numero)

    const encabezado = `⛧───「 Registro 」───⛧\n\n`
    const pie = `\n\n╰─➤ _Responde en este chat, tienes 60 segundos_ 🥀`

    const sent = await sock.sendMessage(
      jid,
      { text: `${encabezado}📝 Paso 1/3 — ¿Cuál es tu nombre?${pie}` },
      { quoted: msg }
    )

    const nombre = await esperarRespuesta(sock, jid, remitente)
    if (!nombre) {
      return sock.sendMessage(jid, { text: '⌛ Se acabó el tiempo. Escribe *.reg* de nuevo cuando quieras.', edit: sent.key })
    }
    if (nombre.length > 25) {
      return sock.sendMessage(jid, { text: '❌ El nombre es muy largo (máximo 25 caracteres). Escribe *.reg* de nuevo.', edit: sent.key })
    }

    await sock.sendMessage(
      jid,
      { text: `${encabezado}✅ Nombre: ${nombre}\n\n📝 Paso 2/3 — ¿Eres hombre o mujer?${pie}`, edit: sent.key }
    )

    const generoTexto = await esperarRespuesta(sock, jid, remitente)
    const genero = generoTexto ? normalizarGenero(generoTexto) : null

    if (!genero) {
      return sock.sendMessage(
        jid,
        { text: '❌ No entendí esa respuesta (o se acabó el tiempo). Escribe *.reg* de nuevo y responde "hombre" o "mujer".', edit: sent.key }
      )
    }

    await sock.sendMessage(
      jid,
      { text: `${encabezado}✅ Nombre: ${nombre}\n✅ Género: ${genero}\n\n📝 Paso 3/3 — ¿Cuántos años tienes?${pie}`, edit: sent.key }
    )

    const edadTexto = await esperarRespuesta(sock, jid, remitente)
    const edad = edadTexto ? parseInt(edadTexto, 10) : NaN

    if (isNaN(edad) || edad < 5 || edad > 120) {
      return sock.sendMessage(
        jid,
        { text: '❌ Edad inválida (o se acabó el tiempo). Debe ser un número entre 5 y 120. Escribe *.reg* de nuevo.', edit: sent.key }
      )
    }

    guardarUsuario(numero, { nombre, genero, edad })

    await sock.sendMessage(
      jid,
      {
        text:
          `${encabezado}` +
          `${yaExiste ? '✅ Datos actualizados' : '✅ Registro completo'}\n\n` +
          `  ❖ nombre: ${nombre}\n` +
          `  ❖ género: ${genero}\n` +
          `  ❖ edad: ${edad}\n\n` +
          `╰─➤ _Usa ${prefijo}perfil para ver tu tarjeta_ 🥀`,
        edit: sent.key,
      }
    )
  },
}