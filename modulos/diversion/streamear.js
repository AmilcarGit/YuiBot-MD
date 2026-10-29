const { crearComandoTrabajo } = require('../../lib/comandosTrabajo')

module.exports = crearComandoTrabajo('streamear', {
  aliases: ['stream'],
  description: 'Haz un directo y gana donaciones según tus espectadores (cada 40 min)',
})
