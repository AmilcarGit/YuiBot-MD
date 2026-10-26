// .logros — insignias y progreso de cada una.
const { caja } = require('../../lib/estilo')
const logros = require('../../lib/logros')
const { obtenerUsuario } = require('../../lib/db')

module.exports = {
  name: 'logros',
  aliases: ['insignias', 'medallas', 'achievements'],
  description: 'Muestra tus logros e insignias (o los de alguien citado)',
  category: 'usuario',

  async execute(sock, msg) {
    const jid = msg.key.remoteJid
    const info = msg.message?.extendedTextMessage?.contextInfo
    const propio = msg.key.participantAlt || msg.key.participant || jid
    const objetivo = info?.mentionedJid?.[0] || info?.participant || propio
    const numero = objetivo.split('@')[0].split(':')[0]

    const nuevos = logros.evaluar(numero)
    const usuario = obtenerUsuario(numero) || {}
    const lista = logros.progreso(usuario)
    const obtenidos = lista.filter((l) => l.desbloqueado)
    const pendientes = lista.filter((l) => !l.desbloqueado)

    const filasGanados = obtenidos.map((l) => `${l.icono} ${l.nombre} — _${l.desc}_`)
    const filasPend = pendientes.map((l) => `🔒 ${l.nombre}: ${l.actual}/${l.meta} (+${l.premio} 💰)`)

    const partes = [
      caja('🏅', 'Logros', [
        ['Usuario', `@${numero}`, '👤'],
        ['Desbloqueados', `${obtenidos.length}/${lista.length}`, '✨'],
      ]),
    ]
    if (filasGanados.length) partes.push(`*Desbloqueados*\n${filasGanados.join('\n')}`)
    if (filasPend.length) partes.push(`*Por conseguir*\n${filasPend.join('\n')}`)
    if (nuevos.length) {
      const total = nuevos.reduce((t, l) => t + l.premio, 0)
      partes.push(`🎉 ¡Nuevo logro: ${nuevos.map((l) => l.nombre).join(', ')}! Ganaste *${total}* monedas.`)
    }

    return sock.sendMessage(jid, { text: partes.join('\n\n'), mentions: [`${numero}@s.whatsapp.net`] }, { quoted: msg })
  },
}
