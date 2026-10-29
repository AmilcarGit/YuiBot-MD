const { crearComandoTrabajo } = require('../../lib/comandosTrabajo')

module.exports = crearComandoTrabajo('reciclar', {
  aliases: [],
  description: 'Junta botellas, latas y cobre para vender (cada 8 min)',
})
