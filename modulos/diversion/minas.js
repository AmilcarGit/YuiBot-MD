//CÓDIGO ORIGINAL DE YUIBOT-MD
const { numeroUsuario, saldo, apostar, pagar, apuestaDesdeArgs, formatoMonedas, panel } = require('../../lib/juegos')
const { enviarJuego } = require('../../lib/juegosVisual')

const { caja } = require('../../lib/estilo')

module.exports = {
  name: 'minas',
  aliases: [],
  description: 'Arriesga monedas en un campo de minas',
  category: 'juegos',
  async execute(sock, msg, args) {
    const numero = numeroUsuario(msg)
    const apuesta = apuestaDesdeArgs(args, 20)
    if (!apuesta) {
      await enviarJuego(sock, msg, {
        icono: '💣',
        titulo: 'Minas',
        subtitulo: 'Arriesga tu moneda oficial y busca la ruta segura.',
        datos: [`💰 Saldo: ${formatoMonedas(saldo(numero))}`, '🎯 Apuesta mínima: 20', '🍀 Ruta segura = x2.5  •  💥 Mina = pérdida'],
        botones: [
          { id: '/minas 20', text: '💣 20' },
          { id: '/minas 50', text: '💣 50' },
          { id: '/minas 100', text: '💣 100' },
        ],
        caption: caja('💣', 'Minas', [['Saldo', formatoMonedas(saldo(numero)), '💰'], ['Apuesta mínima', '20', '🎯'], ['Ruta segura', 'x2.5', '🍀'], ['Mina', 'pérdida', '💥']], 'Desafía a la suerte ✨'),
      })
      return
    }
    const retirada = apostar(numero, apuesta)
    if (!retirada.ok) {
      await sock.sendMessage(msg.key.remoteJid, { text: caja('💣', 'Minas', [['Estado', '❌ Saldo insuficiente'], ['Disponible', formatoMonedas(retirada.disponible), '💰'], ['Necesitas', formatoMonedas(apuesta), '🎯']], 'Consigue más monedas con /daily') }, { quoted: msg })
      return
    }
    const seguro = Math.random() < 0.6
    const premio = Math.floor(apuesta * 2.5)
    if (seguro) pagar(numero, premio)
    await enviarJuego(sock, msg, {
      icono: seguro ? '💎' : '💥',
      titulo: 'Minas',
      subtitulo: seguro ? '¡Ruta segura encontrada!' : '¡BOOM! Pisaste una mina.',
      datos: [seguro ? `🎉 Premio: +${formatoMonedas(premio)}` : `💸 Perdiste: ${formatoMonedas(apuesta)}`, `🎯 Apuesta: ${formatoMonedas(apuesta)}`, `💰 Saldo: ${formatoMonedas(saldo(numero))}`],
      botones: [
        { id: `/minas ${apuesta}`, text: '🔄 Repetir' },
        { id: '/minas 20', text: '💣 20' },
        { id: '/minas 100', text: '💎 100' },
      ],
      caption: caja(seguro ? '💎' : '💥', 'Minas', [['Resultado', seguro ? '💎 ¡Encontraste una ruta segura!' : '💥 ¡BOOM! Pisaste una mina!', '🎯'], ['Apuesta', formatoMonedas(apuesta), '🎲'], ['Saldo', formatoMonedas(saldo(numero)), '💰']], seguro ? '¡Felicidades! 🏆' : 'Suerte en la próxima 🍀'),
    })
  },
}
