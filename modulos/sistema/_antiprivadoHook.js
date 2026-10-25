// Hook de anti-privado (ver lib/proteccion.js). Si devuelve true, el mensaje se
// frena: no se despacha ningún comando de ese chat privado.
const proteccion = require('../../lib/proteccion')

module.exports = {
  async onMessage(sock, msg, ctx) {
    return proteccion.aplicarAntiprivado(sock, msg, ctx)
  },
}
