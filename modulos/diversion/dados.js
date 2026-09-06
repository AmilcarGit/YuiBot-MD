//CÓDIGO ORIGINAL DE YUIBOT-MD
const { numeroUsuario, saldo, apostar, pagar, apuestaDesdeArgs, formatoMonedas } = require('../../lib/juegos')
const { enviarJuego } = require('../../lib/juegosVisual')

module.exports = {
  name: 'dados',
  aliases: [],
  description: 'Apuesta por el resultado de los dados',
  category: 'juegos',
  async execute(sock, msg, args) {
    const numero = numeroUsuario(msg)
    const apuesta = apuestaDesdeArgs(args, 10)
    const eleccion = String(args?.[1] || '').toLowerCase()
    if (!apuesta || !['alto', 'bajo'].includes(eleccion)) {
      await enviarJuego(sock, msg, {
        icono: '🎲',
        titulo: 'Dados',
        subtitulo: 'Elige el lado y pon a prueba tu suerte',
        datos: [`💰 Saldo: ${formatoMonedas(saldo(numero))}`, '🔻 Bajo: 2 a 6', '🔺 Alto: 8 a 12'],
        caption: `╭─ ✦ 🎲 DADOS ✦\n│ 🎯 Apuesta mínima: *10*\n│ ▶️ Ejemplo: */dados 100 alto*\n╰─ 🍃 YuiBot-MD`,
        botones: [
          { id: `/dados ${apuesta || 10} bajo`, text: '🔻 BAJO' },
          { id: `/dados ${apuesta || 10} alto`, text: '🔺 ALTO' },
          { id: '/menu', text: '🍃 MENÚ' },
        ],
      })
      return
    }
    const retirada = apostar(numero, apuesta)
    if (!retirada.ok) {
      await enviarJuego(sock, msg, {
        icono: '💸',
        titulo: 'Dados',
        subtitulo: 'No tienes suficientes monedas',
        datos: [`💰 Disponible: ${formatoMonedas(retirada.disponible)}`, `🎯 Necesitas: ${formatoMonedas(apuesta)}`],
        caption: '❌ Apuesta rechazada',
        botones: [{ id: `/dados ${apuesta} ${eleccion}`, text: '🎲 INTENTAR' }, { id: '/menu', text: '🍃 MENÚ' }],
      })
      return
    }
    const a = Math.floor(Math.random() * 6) + 1
    const b = Math.floor(Math.random() * 6) + 1
    const total = a + b
    const gana = eleccion === 'alto' ? total >= 8 && total <= 12 : total >= 2 && total <= 6
    const premio = gana ? apuesta * 2 : 0
    if (premio) pagar(numero, premio)
    await enviarJuego(sock, msg, {
      icono: gana ? '🎉' : '💥',
      titulo: 'Dados',
      subtitulo: `${a} + ${b} = ${total}`,
      datos: [`🎯 Elección: ${eleccion}`, gana ? `🏆 Premio: +${formatoMonedas(premio)}` : `💸 Pérdida: -${formatoMonedas(apuesta)}`, `💰 Saldo: ${formatoMonedas(saldo(numero))}`],
      caption: gana ? '🎉 ¡Tu apuesta salió bien!' : '💥 Esta vez los dados no estuvieron de tu lado',
      botones: [
        { id: `/dados ${apuesta} ${eleccion}`, text: '🎲 REPETIR' },
        { id: `/dados ${apuesta} ${eleccion === 'alto' ? 'bajo' : 'alto'}`, text: eleccion === 'alto' ? '🔻 BAJO' : '🔺 ALTO' },
        { id: '/menu', text: '🍃 MENÚ' },
      ],
    })
  },
}
