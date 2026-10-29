const { crearComandoTrabajo } = require('../../lib/comandosTrabajo')

module.exports = crearComandoTrabajo('crimen', {
  aliases: ['robar'],
  description: 'Arriesga: 55% de ganar un buen botín, si sale mal pagas multa (cada 45 min)',
})
