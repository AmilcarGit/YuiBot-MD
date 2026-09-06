//CÓDIGO ORIGINAL DE YUIBOT-MD
const { numeroUsuario, estado, progresoNivel, barra, enviarRpg } = require('../../lib/rpg')

module.exports = {
  name: 'perfilrpg',
  description: 'Muestra tu perfil de YUI RPG',
  category: 'rpg',
  async execute(sock, msg) {
    const numero = numeroUsuario(msg)
    const { usuario, xp, nivel, monedas } = estado(numero)
    const p = progresoNivel(xp, nivel)
    const inventario = usuario.inventarioRpg || []
    await enviarRpg(sock, msg, {
      icono: usuario.insigniaEquipada || '🧙',
      titulo: 'Perfil RPG',
      subtitulo: msg.pushName || numero,
      datos: [
        `👤 ${msg.pushName || numero}`,
        `⭐ Nivel: ${nivel}`,
        `✨ XP: ${xp} • ${barra(p.progreso, p.necesario)}`,
        `💰 Monedas: ${monedas.toLocaleString('es-PE')}`,
        `🎒 Loot: ${inventario.length} objetos`,
        `🏆 Título: ${usuario.tituloEquipado || 'Aventurero'}`,
      ],
      caption: `╭─ ✦ ⚔️ PERFIL RPG ✦\n│ 👤 *${msg.pushName || numero}*\n│ ⭐ Nivel *${nivel}*\n│ ✨ XP *${xp}*\n│ 💰 Monedas *${monedas}*\n╰─ 🍃 YuiBot-MD`,
      botones: [{ id: '/nivel', text: '⭐ NIVEL' }, { id: '/inventario', text: '🎒 INVENTARIO' }, { id: '/ranking', text: '🏆 RANKING' }],
    })
  },
}
