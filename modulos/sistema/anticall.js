const { crearComando } = require('../../lib/proteccionComandos')

module.exports = crearComando({
  nombre: 'anticall',
  alias: ['antillamada', 'antillamadas'],
  descripcion: 'Rechaza las llamadas al bot y avisa: .anticall on | off',
  seccion: 'anticall',
  icono: '📵',
  explicacion: 'Cuando alguien llama al bot, la llamada se rechaza y recibe un aviso. Con *bloquear*, quien insiste varias veces seguidas queda bloqueado.',
})
