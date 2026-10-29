const { crearComandoTrabajo } = require('../../lib/comandosTrabajo')

module.exports = crearComandoTrabajo('cazar', {
  aliases: ['caceria'],
  description: 'Sal de cacería: conejos, venados, hasta un oso (cada 25 min)',
})
