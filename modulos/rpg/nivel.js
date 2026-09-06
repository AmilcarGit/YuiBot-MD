//CÓDIGO ORIGINAL DE YUIBOT-MD
const { numeroUsuario, estado, progresoNivel, barra, enviarRpg } = require('../../lib/rpg')

module.exports = {
  name: 'nivel',
  description: 'Muestra tu nivel y progreso de XP',
  category: 'rpg',
  async execute(sock, msg) {
    const numero = numeroUsuario(msg)
    const { xp, nivel } = estado(numero)
    const p = progresoNivel(xp, nivel)
    await enviarRpg(sock, msg, {
      icono: '⭐',
      titulo: `Nivel ${nivel}`,
      subtitulo: 'Tu progreso de experiencia',
      datos: [`⭐ Nivel actual: ${nivel}`, `✨ XP total: ${xp}`, `📈 Progreso: ${p.progreso}/${p.necesario}`, `🔮 ${barra(p.progreso, p.necesario)}`, `🎯 Siguiente nivel: ${p.siguiente} XP`],
      caption: `╭─ ✦ ⭐ NIVEL ✦\n│ ⭐ *Nivel ${nivel}*\n│ ✨ XP: *${xp}*\n│ 📈 *${p.progreso}/${p.necesario}*\n│ 🔮 ${barra(p.progreso, p.necesario)}\n╰─ 🍃 YuiBot-MD`,
      botones: [{ id: '/perfilrpg', text: '🧙 PERFIL' }, { id: '/misiones', text: '📜 MISIONES' }, { id: '/ranking', text: '🏆 RANKING' }],
    })
  },
}
