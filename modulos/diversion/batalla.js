//CÓDIGO ORIGINAL DE YUIBOT-MD
const { numeroUsuario, saldo, apostar, pagar, apuestaDesdeArgs, formatoMonedas } = require('../../lib/juegos')
const { enviarJuego } = require('../../lib/juegosVisual')

const { caja, error, aviso } = require('../../lib/estilo')

module.exports = {
  name: 'batalla',
  aliases: [],
  description: 'Desafía a otro usuario por monedas',
  category: 'juegos',
  async execute(sock, msg, args) {
    const numero = numeroUsuario(msg)
    const contexto = msg.message?.extendedTextMessage?.contextInfo || msg.message?.imageMessage?.contextInfo || msg.message?.videoMessage?.contextInfo || {}
    const mencionado = contexto.mentionedJid?.[0]
    const apuesta = apuestaDesdeArgs(args, 20)
    if (!mencionado || !apuesta) {
      await enviarJuego(sock, msg, {
        icono: '⚔️',
        titulo: 'Batalla',
        subtitulo: 'Desafía a otro jugador por monedas',
        datos: [`💰 Tu saldo: ${formatoMonedas(saldo(numero))}`, '🎯 Mínimo: 20 monedas', '🏆 El ganador se lleva el pozo'],
        caption: caja('⚔️', 'Batalla', [['Uso', '/batalla @usuario 100', '▶️'], ['Mínimo', '20 monedas', '🎯'], ['Premio', 'el ganador se lleva el pozo', '🏆']], 'Desafía a otro jugador ✨'),
        botones: [{ id: '/menu', text: '🍃 MENÚ' }],
      })
      return
    }
    const rival = mencionado.split('@')[0].split(':')[0]
    if (rival === numero) {
      await enviarJuego(sock, msg, {
        icono: '⚔️', titulo: 'Batalla', subtitulo: 'Desafío no válido',
        datos: ['❌ No puedes desafiarte a ti mismo', '👤 Menciona a otro jugador'],
        caption: aviso('Elige un rival diferente'),
        botones: [{ id: '/menu', text: '🍃 MENÚ' }],
      })
      return
    }
    const retiroJugador = apostar(numero, apuesta)
    if (!retiroJugador.ok) {
      await enviarJuego(sock, msg, {
        icono: '💸', titulo: 'Batalla', subtitulo: 'No tienes suficientes monedas',
        datos: [`💰 Disponible: ${formatoMonedas(retiroJugador.disponible)}`, `🎯 Necesitas: ${formatoMonedas(apuesta)}`],
        caption: error('Apuesta rechazada'),
        botones: [{ id: '/menu', text: '🍃 MENÚ' }],
      })
      return
    }
    const retiroRival = apostar(rival, apuesta)
    if (!retiroRival.ok) {
      pagar(numero, apuesta)
      await enviarJuego(sock, msg, {
        icono: '↩️', titulo: 'Batalla', subtitulo: 'El rival no tiene suficiente saldo',
        datos: [`👤 Rival: @${rival}`, `🎯 Apuesta: ${formatoMonedas(apuesta)}`, '💰 Tu apuesta fue devuelta'],
        caption: aviso('La batalla fue cancelada'),
        botones: [{ id: '/menu', text: '🍃 MENÚ' }],
      })
      return
    }
    const ganador = Math.random() < 0.5 ? numero : rival
    const premio = apuesta * 2
    pagar(ganador, premio)
    const nombreGanador = ganador === numero ? 'Tú' : `@${rival}`
    await enviarJuego(sock, msg, {
      icono: ganador === numero ? '🏆' : '⚔️',
      titulo: 'Batalla',
      subtitulo: `Ganador: ${nombreGanador}`,
      datos: [`👤 Tú: @${numero}`, `⚔️ Rival: @${rival}`, `🏆 Premio: ${formatoMonedas(premio)}`, `💰 Saldo: ${formatoMonedas(saldo(numero))}`],
      caption: caja(ganador === numero ? '🏆' : '⚔️', 'Batalla', [['Resultado', ganador === numero ? '🎉 ¡Ganaste la batalla!' : '💥 El rival ganó esta vez', '⚔️'], ['Premio', formatoMonedas(premio), '🏆'], ['Saldo', formatoMonedas(saldo(numero)), '💰']], 'Buena pelea ✨'),
      botones: [{ id: '/menu', text: '🍃 MENÚ' }],
    })
  },
}
