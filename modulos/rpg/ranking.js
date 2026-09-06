//CÓDIGO ORIGINAL DE YUIBOT-MD
const fs = require('fs')
const path = require('path')
const { numeroUsuario, enviarRpg } = require('../../lib/rpg')

module.exports = {
  name: 'ranking',
  description: 'Muestra el ranking global de YUI RPG',
  category: 'rpg',
  async execute(sock, msg) {
    const ruta = path.join(__dirname, '..', '..', 'data', 'usuarios.json')
    let data = {}
    try { data = JSON.parse(fs.readFileSync(ruta, 'utf-8')) } catch {}
    const lista = Object.entries(data)
      .map(([numero, u]) => ({ numero, nivel: u.nivel || 0, xp: u.xp || 0, monedas: u.monedas || 0 }))
      .sort((a, b) => b.nivel - a.nivel || b.xp - a.xp || b.monedas - a.monedas)
      .slice(0, 8)
    const yo = numeroUsuario(msg)
    const datos = lista.map((u, i) => `${i + 1}. ${u.numero === yo ? '👑' : '⚔️'} ${u.numero} • Nv.${u.nivel} • ${u.xp} XP`)
    await enviarRpg(sock, msg, { icono: '🏆', titulo: 'Ranking', subtitulo: 'Los mejores aventureros', datos: datos.length ? datos : ['🌱 Aún no hay aventureros registrados'], caption: `╭─ ✦ 🏆 RANKING RPG ✦\n│ 🥇 Mejores aventureros\n│ ⭐ Ordenado por nivel y XP\n╰─ 🍃 YuiBot-MD`, botones: [{ id: '/perfilrpg', text: '🧙 MI PERFIL' }, { id: '/nivel', text: '⭐ MI NIVEL' }, { id: '/duelo', text: '⚔️ DUELO' }] })
  },
}
