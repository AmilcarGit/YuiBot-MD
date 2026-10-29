const { crearComandoTrabajo } = require('../../lib/comandosTrabajo')

module.exports = crearComandoTrabajo('pescar', {
  aliases: ['pesca'],
  description: 'Lanza la caña y vende lo que pesques (cada 15 min)',
})
