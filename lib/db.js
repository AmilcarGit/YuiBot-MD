function agregarMonedas(numero, cantidad) {
  const data = leerTodo()
  const actual = data[numero] || {}
  const balanceAnterior = actual.monedas || 0
  const balanceNuevo = Math.max(0, balanceAnterior + cantidad)

  data[numero] = { ...actual, monedas: balanceNuevo, actualizado: Date.now() }
  guardarTodo(data)

  return balanceNuevo
}

function reclamarDaily(numero, opciones = {}) {
  const { COOLDOWN_MS = 24 * 60 * 60 * 1000, MIN = 100, MAX = 300 } = opciones || {}

  const data = leerTodo()
  const actual = data[numero] || {}
  const ahora = Date.now()

  if (actual.ultimoDaily && ahora - actual.ultimoDaily < COOLDOWN_MS) {
    return { exito: false, restanteMs: COOLDOWN_MS - (ahora - actual.ultimoDaily) }
  }

  const ganado = Math.floor(Math.random() * (MAX - MIN + 1)) + MIN
  const balanceNuevo = (actual.monedas || 0) + ganado

  data[numero] = { ...actual, monedas: balanceNuevo, ultimoDaily: ahora, actualizado: ahora }
  guardarTodo(data)

  return { exito: true, ganado, monedas: balanceNuevo }
}

module.exports = {
  obtenerUsuario,
  guardarUsuario,
  calcularNivel,
  xpParaNivel,
  agregarXpConCooldown,
  agregarMonedas,
  reclamarDaily,
}