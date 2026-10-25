// Reputación compartida: se guarda en el usuario (data/usuarios.json), por lo
// que es la misma en el principal y en todos los subbots.
const { obtenerUsuario, guardarUsuario, listarUsuarios } = require('./db')

const COOLDOWN_MS = 24 * 60 * 60 * 1000

// Un usuario solo puede dar +1 a la misma persona una vez cada 24 h.
function dar(desde, hacia, ahora = Date.now()) {
  if (desde === hacia) return { ok: false, motivo: 'propio' }
  const yo = obtenerUsuario(desde) || {}
  const dados = { ...(yo.repDados || {}) }
  const ultimo = dados[hacia] || 0
  if (ahora - ultimo < COOLDOWN_MS) return { ok: false, motivo: 'cooldown', restante: COOLDOWN_MS - (ahora - ultimo) }
  dados[hacia] = ahora
  guardarUsuario(desde, { repDados: dados })
  const rep = (obtenerUsuario(hacia)?.reputacion || 0) + 1
  guardarUsuario(hacia, { reputacion: rep })
  return { ok: true, total: rep }
}

function obtener(numero) {
  return obtenerUsuario(numero)?.reputacion || 0
}

function top(limite = 10) {
  return Object.entries(listarUsuarios())
    .map(([numero, u]) => ({ numero, reputacion: u?.reputacion || 0 }))
    .filter((u) => u.reputacion > 0)
    .sort((a, b) => b.reputacion - a.reputacion)
    .slice(0, limite)
}

module.exports = { dar, obtener, top, COOLDOWN_MS }
