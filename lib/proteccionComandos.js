// Fábrica de los comandos .anticall y .antiprivado (misma sintaxis, distinta sección).
//   .anticall                    → muestra el estado
//   .anticall on | off           → activa o desactiva
//   .anticall bloquear on | off  → bloquear a quien insiste
//   .anticall mensaje <texto>    → cambia el aviso   ("mensaje reset" lo restaura)
const proteccion = require('./proteccion')

const MAX_MENSAJE = 400

function crearComando({ nombre, alias, descripcion, seccion, icono, explicacion }) {
  return {
    name: nombre,
    aliases: alias,
    description: descripcion,
    category: 'sistema',
    subbotOwnerOnly: true,

    async execute(sock, msg, args, { config, esSubBot, subbotNumero }) {
      const jid = msg.key.remoteJid
      const prefijo = config.PREFIXES[0]
      const idBot = esSubBot ? subbotNumero : 'principal'
      const [accion, ...resto] = args
      const a = String(accion || '').toLowerCase()

      const responder = (text) => sock.sendMessage(jid, { text }, { quoted: msg })
      const estado = () => proteccion.obtener(idBot)[seccion]

      if (!a) {
        const e = estado()
        return responder(
          `${icono} *${nombre.toUpperCase()}*\n\n` +
          `Estado: *${e.activo ? 'ACTIVO ✅' : 'APAGADO ❌'}*\n` +
          `Bloquear a quien insiste: *${e.bloquear ? 'sí' : 'no'}*\n` +
          `Aviso:\n_${e.mensaje}_\n\n` +
          `${explicacion}\n\n` +
          `📌 ${prefijo}${nombre} on | off\n` +
          `📌 ${prefijo}${nombre} bloquear on | off\n` +
          `📌 ${prefijo}${nombre} mensaje <texto>`
        )
      }

      if (a === 'on' || a === 'off') {
        proteccion.actualizar(idBot, seccion, { activo: a === 'on' })
        return responder(`${icono} ${nombre} ${a === 'on' ? 'activado ✅' : 'desactivado ❌'}`)
      }

      if (a === 'bloquear') {
        const valor = String(resto[0] || '').toLowerCase()
        if (valor !== 'on' && valor !== 'off') return responder(`❌ Usa: ${prefijo}${nombre} bloquear on | off`)
        proteccion.actualizar(idBot, seccion, { bloquear: valor === 'on' })
        return responder(`🚫 Bloquear a quien insiste: *${valor === 'on' ? 'activado' : 'desactivado'}*`)
      }

      if (a === 'mensaje') {
        const texto = resto.join(' ').trim()
        if (!texto) return responder(`❌ Escribe el aviso.\n\n📌 ${prefijo}${nombre} mensaje No atiendo llamadas, escríbeme.`)
        if (texto.toLowerCase() === 'reset') {
          const original = proteccion.actualizar(idBot, seccion, { mensaje: proteccion.POR_DEFECTO[seccion].mensaje })
          return responder(`✅ Aviso restaurado:\n_${original.mensaje}_`)
        }
        if (texto.length > MAX_MENSAJE) return responder(`❌ El aviso es muy largo (máx. ${MAX_MENSAJE} caracteres).`)
        proteccion.actualizar(idBot, seccion, { mensaje: texto })
        return responder(`✅ Aviso actualizado:\n_${texto}_`)
      }

      return responder(`❌ No entendí "${a}".\n\n📌 ${prefijo}${nombre} on | off | bloquear on|off | mensaje <texto>`)
    },
  }
}

module.exports = { crearComando }
