//CÓDIGO ORIGINAL DE YUIBOT-MD
const { numeroUsuario, saldo, apostar, pagar, apuestaDesdeArgs, formatoMonedas } = require('../../lib/juegos')
const { enviarJuego } = require('../../lib/juegosVisual')

module.exports = {
  name: 'carrera',
  aliases: [],
  description: 'Apuesta por un corredor y gana monedas',
  category: 'juegos',
  async execute(sock, msg, args) {
    const numero = numeroUsuario(msg)
    const apuesta = apuestaDesdeArgs(args, 20)
    const corredor = Number(args?.[1])
    if (!apuesta || ![1, 2, 3, 4].includes(corredor)) {
      await enviarJuego(sock, msg, {
        icono: '🏇',
        titulo: 'Carrera',
        subtitulo: 'Elige un corredor y busca el premio x3',
        datos: [`💰 Saldo: ${formatoMonedas(saldo(numero))}`, '🎯 Mínimo: 20 monedas', '🏇 Corredores: 1 • 2 • 3 • 4'],
        caption: '╭─ ✦ 🏇 CARRERA ✦\n│ ▶️ Ejemplo: */carrera 100 2*\n╰─ 🍃 YuiBot-MD',
        botones: [
          { id: `/carrera ${apuesta || 20} 1`, text: '🏇 1' },
          { id: `/carrera ${apuesta || 20} 2`, text: '🏇 2' },
          { id: `/carrera ${apuesta || 20} 3`, text: '🏇 3' },
          { id: `/carrera ${apuesta || 20} 4`, text: '🏇 4' },
        ],
      })
      return
    }
    const retirada = apostar(numero, apuesta)
    if (!retirada.ok) {
      await enviarJuego(sock, msg, {
        icono: '💸', titulo: 'Carrera', subtitulo: 'Saldo insuficiente',
        datos: [`💰 Disponible: ${formatoMonedas(retirada.disponible)}`, `🎯 Necesitas: ${formatoMonedas(apuesta)}`],
        caption: '❌ No se pudo entrar a la carrera',
        botones: [{ id: `/carrera ${apuesta} ${corredor}`, text: '🏇 INTENTAR' }, { id: '/menu', text: '🍃 MENÚ' }],
      })
      return
    }
    const ganador = Math.floor(Math.random() * 4) + 1
    const gana = corredor === ganador
    const premio = gana ? apuesta * 3 : 0
    if (premio) pagar(numero, premio)
    await enviarJuego(sock, msg, {
      icono: gana ? '🏆' : '🏁',
      titulo: 'Carrera',
      subtitulo: `Ganó el corredor ${ganador}`,
      datos: [`🎯 Elegiste: corredor ${corredor}`, gana ? `🏆 Premio: +${formatoMonedas(premio)}` : `💸 Pérdida: -${formatoMonedas(apuesta)}`, `💰 Saldo: ${formatoMonedas(saldo(numero))}`],
      caption: gana ? '🎉 ¡Tu corredor llegó primero!' : '🏁 Esta carrera no fue tuya',
      botones: [
        { id: `/carrera ${apuesta} ${corredor}`, text: '🏇 REPETIR' },
        { id: `/carrera ${apuesta} ${ganador}`, text: `🏆 CORREDOR ${ganador}` },
        { id: '/menu', text: '🍃 MENÚ' },
      ],
    })
  },
}
