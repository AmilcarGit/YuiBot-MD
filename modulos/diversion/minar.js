const { crearComandoTrabajo } = require('../../lib/comandosTrabajo')

module.exports = crearComandoTrabajo('minar', {
  aliases: ['picar'],
  description: 'Mina minerales y véndelos: desde piedra hasta diamantes (cada 20 min)',
})
