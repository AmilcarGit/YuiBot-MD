//CÓDIGO ORIGINAL DE YUIBOT-MD
const { obtenerUsuario, agregarMonedasConBoost } = require('./db')

function numeroUsuario(msg) {
  const jid = msg.key.participantAlt || msg.key.participant || msg.key.remoteJid
  return jid.split('@')[0].split(':')[0]
}

function saldo(numero) {
  return obtenerUsuario(numero)?.monedas || 0
}

function apostar(numero, cantidad) {
  if (!Number.isInteger(cantidad) || cantidad <= 0) return { ok: false, motivo: 'cantidad' }
  const disponible = saldo(numero)
  if (cantidad > disponible) return { ok: false, motivo: 'saldo', disponible }
  agregarMonedasConBoost(numero, -cantidad)
  return { ok: true, disponible: disponible - cantidad }
}

function pagar(numero, cantidad) {
  const ganado = Math.max(0, Math.floor(cantidad))
  const nuevoSaldo = agregarMonedasConBoost(numero, ganado)
  return { ganado, saldo: nuevoSaldo }
}

function apuestaDesdeArgs(args, minimo = 10) {
  const valor = Number(args?.[0])
  if (!Number.isInteger(valor) || valor < minimo) return null
  return valor
}

function formatoMonedas(n) {
  return Number(n || 0).toLocaleString('es-PE')
}

function panel(titulo, lineas, cierre = '🍃 YuiBot-MD') {
  return `╭─ ✦ ${titulo} ✦\n${lineas.map(x => `│ ${x}`).join('\n')}\n╰─ ${cierre}`
}

function errorApuesta(prefijo, numero, minimo) {
  const actual = saldo(numero)
  return panel(`${prefijo} • YUI GAMES`, [
    `💰 Saldo: *${formatoMonedas(actual)}*`,
    `🎯 Apuesta mínima: *${formatoMonedas(minimo)}*`,
    `▶️ Usa: *${prefijo.toLowerCase()} ${minimo}*`,
  ])
}

module.exports = {
  numeroUsuario,
  saldo,
  apostar,
  pagar,
  apuestaDesdeArgs,
  formatoMonedas,
  panel,
  errorApuesta,
}
