//CÓDIGO ORIGINAL DE YUIBOT-MD
const { numeroUsuario, saldo, apostar, pagar, apuestaDesdeArgs, formatoMonedas } = require('../../lib/juegos')
const { enviarJuego } = require('../../lib/juegosVisual')

module.exports = {
  name: 'caraocruz',
  aliases: [],
  description: 'Apuesta en cara o cruz',
  category: 'juegos',
  async execute(sock, msg, args) {
    const numero = numeroUsuario(msg)
    const apuesta = apuestaDesdeArgs(args, 10)
    const eleccion = String(args?.[1] || '').toLowerCase()
    if (!apuesta || !['cara', 'cruz'].includes(eleccion)) {
      await enviarJuego(sock, msg, {
        icono: '🪙',
        titulo: 'Cara o Cruz',
        subtitulo: 'Dobla tu apuesta si aciertas',
        datos: [`💰 Saldo: ${formatoMonedas(saldo(numero))}`, '🎯 Mínimo: 10 monedas', '🪙 Elige cara o cruz'],
        caption: '╭─ ✦ 🪙 CARA O CRUZ ✦\n│ ▶️ Ejemplo: */caraocruz 100 cara*\n╰─ 🍃 YuiBot-MD',
        botones: [
          { id: `/caraocruz ${apuesta || 10} cara`, text: '👑 CARA' },
          { id: `/caraocruz ${apuesta || 10} cruz`, text: '🪙 CRUZ' },
          { id: '/menu', text: '🍃 MENÚ' },
        ],
      })
      return
    }
    const retirada = apostar(numero, apuesta)
    if (!retirada.ok) {
      await enviarJuego(sock, msg, {
        icono: '💸',
        titulo: 'Cara o Cruz',
        subtitulo: 'Saldo insuficiente',
        datos: [`💰 Disponible: ${formatoMonedas(retirada.disponible)}`, `🎯 Necesitas: ${formatoMonedas(apuesta)}`],
        caption: '❌ No se pudo realizar la apuesta',
        botones: [{ id: `/caraocruz ${apuesta} ${eleccion}`, text: '🪙 INTENTAR' }, { id: '/menu', text: '🍃 MENÚ' }],
      })
      return
    }
    const resultado = Math.random() < 0.5 ? 'cara' : 'cruz'
    const gana = resultado === eleccion
    const premio = gana ? apuesta * 2 : 0
    if (premio) pagar(numero, premio)
    await enviarJuego(sock, msg, {
      icono: gana ? '🎉' : '💥',
      titulo: 'Cara o Cruz',
      subtitulo: `Salió ${resultado}`,
      datos: [`🎯 Elegiste: ${eleccion}`, gana ? `🏆 Premio: +${formatoMonedas(premio)}` : `💸 Pérdida: -${formatoMonedas(apuesta)}`, `💰 Saldo: ${formatoMonedas(saldo(numero))}`],
      caption: gana ? '🎉 ¡Acertaste!' : '💥 No salió tu elección',
      botones: [
        { id: `/caraocruz ${apuesta} ${eleccion}`, text: '🪙 REPETIR' },
        { id: `/caraocruz ${apuesta} ${eleccion === 'cara' ? 'cruz' : 'cara'}`, text: eleccion === 'cara' ? '🪙 CRUZ' : '👑 CARA' },
        { id: '/menu', text: '🍃 MENÚ' },
      ],
    })
  },
}
