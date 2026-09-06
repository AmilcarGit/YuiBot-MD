//CÓDIGO ORIGINAL DE YUIBOT-MD
const { numeroUsuario, estado, enviarRpg, sumarMision } = require('../../lib/rpg')
const { obtenerGrupo, guardarGrupo, agregarMonedasConBoost, agregarXpConCooldown } = require('../../lib/db')

module.exports = {
  name: 'boss',
  description: 'Combate contra el jefe del grupo',
  category: 'rpg',
  async execute(sock, msg) {
    const jid = msg.key.remoteJid
    if (!jid.endsWith('@g.us')) {
      await enviarRpg(sock, msg, { icono: '👹', titulo: 'Boss', subtitulo: 'Disponible en grupos', datos: ['⚔️ Usa este comando dentro de un grupo'], botones: [{ id: '/perfilrpg', text: '🧙 PERFIL' }] })
      return
    }
    const numero = numeroUsuario(msg)
    const { nivel } = estado(numero)
    const grupo = obtenerGrupo(jid) || {}
    let boss = grupo.rpgBoss
    if (!boss || boss.hp <= 0) {
      boss = { nombre: ['🐉 Dragón Abisal', '👹 Rey Demonio', '🦖 Coloso Antiguo'][Math.floor(Math.random() * 3)], nivel: Math.max(3, nivel + 2), hp: 500 + Math.max(0, nivel - 1) * 80, maxHp: 500 + Math.max(0, nivel - 1) * 80 }
    }
    const dano = 25 + nivel * 5 + Math.floor(Math.random() * 31)
    boss.hp = Math.max(0, boss.hp - dano)
    const vencido = boss.hp === 0
    guardarGrupo(jid, { rpgBoss: vencido ? null : boss })
    if (vencido) {
      const monedas = 300 + boss.nivel * 25
      agregarMonedasConBoost(numero, monedas)
      agregarXpConCooldown(numero, { COOLDOWN_MS: 0, MIN: 50, MAX: 80 })
      sumarMision(numero, 'boss')
    }
    await enviarRpg(sock, msg, { icono: vencido ? '🏆' : '👹', titulo: vencido ? 'Boss derrotado' : boss.nombre, subtitulo: vencido ? '¡El grupo ha vencido al jefe!' : `Nivel ${boss.nivel}`, datos: [`❤️ HP: ${boss.hp}/${boss.maxHp}`, `⚔️ Tu daño: ${dano}`, vencido ? `🏆 Recompensa: +${300 + boss.nivel * 25}` : '🔥 ¡Ataca de nuevo para debilitarlo!', vencido ? '⭐ XP: +50~80' : '👥 El próximo ataque continúa la batalla'], caption: vencido ? '🏆 ¡Boss derrotado! Recompensa entregada.' : `👹 ${boss.nombre}\n❤️ ${boss.hp}/${boss.maxHp}\n⚔️ Daño realizado: ${dano}`, botones: [{ id: '/boss', text: '⚔️ ATACAR' }, { id: '/perfilrpg', text: '🧙 PERFIL' }, { id: '/ranking', text: '🏆 RANKING' }] })
  },
}
