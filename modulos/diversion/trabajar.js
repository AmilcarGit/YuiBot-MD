const { crearComandoTrabajo } = require('../../lib/comandosTrabajo')

module.exports = crearComandoTrabajo('trabajar', {
  aliases: ['chambear', 'laburar'],
  description: 'Trabaja y gana monedas; tu puesto mejora con tu nivel (cada 30 min)',
})
