//CÓDIGO ORIGINAL DE YUIBOT-MD
const { numeroUsuario, estado, enviarRpg, sumarMision } = require('../../lib/rpg')
const { agregarMonedasConBoost, agregarXpConCooldown } = require('../../lib/db')

module.exports = {
  name: 'duelo',
  description: 'Desafía a otro usuario a un duelo RPG',
  category: 'rpg',
  async execute(sock, msg) {
    const rival = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0]
    if (!rival) {
      await enviarRpg(sock, msg, { icono: '⚔️', titulo: 'Duelo', subtitulo: 'Desafía a un rival', datos: ['👥 Menciona a un usuario para iniciar', '🎯 Ejemplo: /duelo @usuario', '🏆 El ganador recibe monedas y XP'], botones: [{ id: '/perfilrpg', text: '🧙 PERFIL' }, { id: '/ranking', text: '🏆 RANKING' }] })
      return
    }
    const numero = numeroUsuario(msg)
    const rivalNumero = rival.split('@')[0].split(':')[0]
    if (rivalNumero === numero) {
      await enviarRpg(sock, msg, { icono: '🚫', titulo: 'Duelo', subtitulo: 'No puedes luchar contigo mismo', datos: ['⚔️ Elige otro rival'], botones: [{ id: '/perfilrpg', text: '🧙 PERFIL' }] })
      return
    }
    const yo = estado(numero)
    const enemigo = estado(rivalNumero)
    const poderYo = yo.nivel * 20 + Math.floor(Math.random() * 51)
    const poderRival = enemigo.nivel * 20 + Math.floor(Math.random() * 51)
    const gano = poderYo >= poderRival
    const ganador = gano ? numero : rivalNumero
    const premio = 100 + Math.abs(yo.nivel - enemigo.nivel) * 20
    agregarMonedasConBoost(ganador, premio)
    agregarXpConCooldown(ganador, { COOLDOWN_MS: 0, MIN: 25, MAX: 40 })
    sumarMision(numero, 'duelo')
    await enviarRpg(sock, msg, { icono: gano ? '🏆' : '💀', titulo: 'Duelo RPG', subtitulo: gano ? '¡Victoria!' : 'Derrota', datos: [`⚔️ Tú: ${poderYo} poder`, `🛡️ Rival: ${poderRival} poder`, `🏆 Ganador: ${ganador}`, `💰 Premio: +${premio}`, `⭐ XP: +25~40`], caption: gano ? '🏆 ¡Has derrotado a tu rival!' : '💀 Tu rival ganó el combate', botones: [{ id: '/duelo', text: '⚔️ OTRO DUELO' }, { id: '/perfilrpg', text: '🧙 PERFIL' }, { id: '/ranking', text: '🏆 RANKING' }] })
  },
}
