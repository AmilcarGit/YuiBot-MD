//CÓDIGO ORIGINAL DE YUIBOT-MD
const { obtenerUsuario, calcularNivel, xpParaNivel } = require('../../lib/db')
const { obtenerRangoPorNivel } = require('../../lib/roles')
const logros = require('../../lib/logros')
const { caja } = require('../../lib/estilo')
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
      logros.evaluar(numero)
      const actual = obtenerUsuario(numero) || datos || {}
      const xp = actual.xp || 0
      const nivel = Math.max(1, calcularNivel(xp))
      const base = xpParaNivel(nivel)
      const lista = logros.progreso(actual)
      const obtenidos = lista.filter((l) => l.desbloqueado)

      const imagen = await generarTarjetaPerfil({
        numero,
        nombre: actual.nombre || 'Sin registrar',
        genero: actual.genero || null,
        edad: actual.edad || null,
        avatar,
        background: config.PROFILE_BACKGROUND,
        botName: config.BOT_NAME,
        nivel,
        xp,
        progreso: Math.max(0, xp - base),
        necesario: Math.max(1, xpParaNivel(nivel + 1) - base),
        rango: obtenerRangoPorNivel(nivel)?.nombre || 'Novato',
        posicion: logros.posicionGlobal(numero),
        mensajes: actual.mensajes || 0,
        monedas: actual.monedas || 0,
        reputacion: actual.reputacion || 0,
        racha: actual.racha || 0,
        insignias: obtenidos.map((l) => ({ color: logros.COLORES_TIER[l.tier] })),
        logrosObtenidos: obtenidos.length,
        totalLogros: lista.length,
      })

      const caption = datos
        ? caja('👤', 'Perfil', [['Nombre', datos.nombre], ['Género', datos.genero], ['Edad', datos.edad], ['Nivel', nivel, '⭐'], ['Logros', `${obtenidos.length}/${lista.length}`, '🏅']], `${prefijo}logros para ver tus insignias · ${prefijo}reg para actualizar tus datos`)
        : caja('👤', 'Perfil', [['Estado', 'Sin registrar'], ['Nivel', nivel, '⭐'], ['Logros', `${obtenidos.length}/${lista.length}`, '🏅']], `Usa ${prefijo}reg para registrarte`)

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