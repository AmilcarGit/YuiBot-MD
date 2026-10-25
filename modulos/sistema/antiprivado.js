const { crearComando } = require('../../lib/proteccionComandos')

module.exports = crearComando({
  nombre: 'antiprivado',
  alias: ['antipv', 'sologrupos'],
  descripcion: 'El bot no atiende chats privados de usuarios (solo grupos): .antiprivado on | off',
  seccion: 'antiprivado',
  icono: '🔒',
  explicacion: 'Los usuarios que escriben por privado reciben un aviso y no pueden usar comandos (los owners y .code siguen funcionando). Con *bloquear*, quien insiste queda bloqueado.',
})
