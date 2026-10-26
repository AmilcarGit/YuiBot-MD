//CÓDIGO ORIGINAL DE YUIBOT-MD
const { caja } = require('../../lib/estilo')
const { numeroUsuario, estado, enviarRpg } = require('../../lib/rpg')
const { CATALOGO } = require('../../lib/tienda')

module.exports = {
  name: 'inventariorpg',
  aliases: ['mochila', 'mochilarpg'],
  description: 'Muestra tu inventario de YUI RPG',
  category: 'rpg',
  async execute(sock, msg) {
    const numero = numeroUsuario(msg)
    const { usuario } = estado(numero)
    const objetos = usuario.inventarioRpg || []
    const comprados = usuario.inventario || []
    const nombres = objetos.slice(-6).map((x, i) => `${i + 1}. ${x.icono || '🎁'} ${x.nombre || x.id || 'Objeto'}`)
    const tienda = comprados.slice(-4).map((id) => {
      const item = CATALOGO.find((x) => x.id === id)
      return item ? `${item.valor || '🎒'} ${item.nombre}` : `🎒 #${id}`
    })
    await enviarRpg(sock, msg, {
      icono: '🎒',
      titulo: 'Inventario',
      subtitulo: 'Tus objetos y recompensas',
      datos: [...nombres, ...(nombres.length < 4 ? tienda : [])].slice(0, 6),
      caption: caja('🎒', 'Inventario', [['Loot RPG', objetos.length, '🎁'], ['Objetos de tienda', comprados.length, '🛒']], 'YuiBot-MD 🍃'),
      botones: [{ id: '/loot', text: '🎁 LOOT' }, { id: '/tienda', text: '🛒 TIENDA' }, { id: '/perfilrpg', text: '🧙 PERFIL' }],
    })
  },
}