//CÓDIGO ORIGINAL DE YUIBOT-MD
const { numeroUsuario, estado, enviarRpg, sumarMision } = require('../../lib/rpg')
const { obtenerUsuario, guardarUsuario, agregarMonedasConBoost } = require('../../lib/db')

const LOOT = [
  ['🧪', 'Poción Lunar', 40],
  ['🗡️', 'Espada Espectral', 80],
  ['🛡️', 'Escudo de Cristal', 100],
  ['💎', 'Cristal Celestial', 160],
  ['👑', 'Corona del Dragón', 300],
  ['🐉', 'Alma de Dragón', 500],
]

module.exports = {
  name: 'loot',
  description: 'Abre un cofre y consigue loot RPG',
  category: 'rpg',
  async execute(sock, msg) {
    const numero = numeroUsuario(msg)
    const costo = 75
    const usuario = obtenerUsuario(numero) || {}
    const saldo = usuario.monedas || 0
    if (saldo < costo) {
      await enviarRpg(sock, msg, { icono: '🎁', titulo: 'Loot', subtitulo: 'Cofre bloqueado', datos: [`💰 Necesitas: ${costo}`, `💰 Tienes: ${saldo}`, '🎯 Consigue monedas jugando y vuelve a intentarlo'], botones: [{ id: '/duelo', text: '⚔️ DUELO' }, { id: '/boss', text: '👹 BOSS' }] })
      return
    }
    agregarMonedasConBoost(numero, -costo)
    const [icono, nombre, valor] = LOOT[Math.floor(Math.random() * LOOT.length)]
    const inventario = usuario.inventarioRpg || []
    inventario.push({ id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, icono, nombre, valor })
    guardarUsuario(numero, { inventarioRpg: inventario })
    sumarMision(numero, 'loot')
    const extra = Math.random() < 0.2 ? Math.floor(Math.random() * 101) + 50 : 0
    if (extra) agregarMonedasConBoost(numero, extra)
    await enviarRpg(sock, msg, { icono, titulo: 'Loot obtenido', subtitulo: nombre, datos: [`🎁 Objeto: ${icono} ${nombre}`, `💎 Rareza: ${valor >= 300 ? 'LEGENDARIO' : valor >= 100 ? 'ÉPICO' : 'COMÚN'}`, `💰 Cofre: -${costo}`, extra ? `🍀 Bonus: +${extra} monedas` : '🍀 Bonus: ninguno'], caption: `🎁 ¡Has encontrado *${icono} ${nombre}*!`, botones: [{ id: '/loot', text: '🎁 ABRIR OTRO' }, { id: '/inventario', text: '🎒 INVENTARIO' }, { id: '/tienda', text: '🛒 TIENDA' }] })
  },
}
