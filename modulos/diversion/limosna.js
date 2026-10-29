const { crearComandoTrabajo } = require('../../lib/comandosTrabajo')

module.exports = crearComandoTrabajo('limosna', {
  aliases: ['mendigar'],
  description: 'Pide monedas: poco pero seguro, con suerte un billete (cada 5 min)',
})
