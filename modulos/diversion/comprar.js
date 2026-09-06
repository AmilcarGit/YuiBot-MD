//CÓDIGO ORIGINAL DE YUIBOT-MD
const { obtenerItem } = require('../../lib/tienda')
const { comprarItem } = require('../../lib/db')
const { numeroUsuario, enviarRpg } = require('../../lib/rpg')

module.exports = {
  name: 'comprar',
  description: 'Compra un objeto de la tienda RPG',
  category: 'rpg',
  async execute(sock, msg, args) {
    const numero = numeroUsuario(msg)
    const id = parseInt(args?.[0], 10)
    const item = obtenerItem(id)
    if (!item) {
      await enviarRpg(sock, msg, { icono: '🛒', titulo: 'Comprar', subtitulo: 'Objeto no encontrado', datos: ['❌ Ese ID no existe', '🛒 Usa /tienda para ver el catálogo'], botones: [{ id: '/tienda', text: '🛒 TIENDA' }] })
      return
    }
    const resultado = comprarItem(numero, item)
    if (!resultado.exito) {
      const motivo = resultado.motivo === 'saldo' ? '💰 No tienes suficientes monedas' : resultado.motivo === 'ya_tiene' ? '🎒 Ya tienes este objeto' : '❌ No se pudo completar'
      await enviarRpg(sock, msg, { icono: '🚫', titulo: 'Compra rechazada', subtitulo: item.nombre, datos: [`💰 Precio: ${item.precio}`, motivo], botones: [{ id: '/tienda', text: '🛒 TIENDA' }, { id: '/inventario', text: '🎒 INVENTARIO' }] })
      return
    }
    await enviarRpg(sock, msg, { icono: item.valor || '🛍️', titulo: 'Compra realizada', subtitulo: item.nombre, datos: [`🛍️ ${item.nombre}`, `💰 Precio: ${item.precio}`, item.tipo === 'cofre' ? `🎁 Bonus: +${resultado.ganado}` : '✨ Objeto añadido a tu inventario'], botones: [{ id: '/tienda', text: '🛒 SEGUIR COMPRANDO' }, { id: '/inventario', text: '🎒 INVENTARIO' }, { id: '/perfilrpg', text: '🧙 PERFIL' }] })
  },
}
