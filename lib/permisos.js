// Permisos de comandos — un solo lugar para main.js y subbot.js.
//
// Niveles que puede declarar un comando:
//   ownerOnly: true          → SOLO los owners del bot principal (config.OWNERS),
//                              también cuando el comando llega por un subbot.
//   subbotOwnerOnly: true    → owners del bot principal O el dueño de ese subbot
//                              (comandos de autogestión: .setprefix, .misubbot...).
//                              En el bot principal equivale a ownerOnly.
//   (ninguno)                → cualquiera.
//
// Si un comando declara ambos, manda ownerOnly (el más estricto).

const { isOwner, obtenerCandidatosPropietario } = require('./handler')
const { esDuenoDeSubbot } = require('./subbots')

function esOwnerPrincipal(sock, msg, config) {
  return obtenerCandidatosPropietario(sock, msg).some((jid) => isOwner(jid, config))
}

/**
 * @returns {{ permitido: boolean, motivo?: 'owner' | 'owner_principal' | 'dueno_subbot' }}
 */
function evaluarPermiso(command, { sock, msg, config, esSubBot = false, subbotNumero = null }) {
  const requiereOwner = Boolean(command?.ownerOnly)
  const requiereDueno = Boolean(command?.subbotOwnerOnly)

  if (!requiereOwner && !requiereDueno) return { permitido: true }

  if (esOwnerPrincipal(sock, msg, config)) return { permitido: true }

  if (requiereDueno && !requiereOwner && esSubBot && subbotNumero) {
    const candidatos = obtenerCandidatosPropietario(sock, msg)
    if (esDuenoDeSubbot(subbotNumero, candidatos)) return { permitido: true }
    return { permitido: false, motivo: 'dueno_subbot' }
  }

  return { permitido: false, motivo: esSubBot ? 'owner_principal' : 'owner' }
}

function mensajeDenegado(motivo) {
  if (motivo === 'dueno_subbot') return '⛔ Este comando es solo para el dueño de este subbot.'
  if (motivo === 'owner_principal') return '⛔ Este comando es solo para el owner del bot principal.'
  return '⛔ Este comando es solo para el owner del bot.'
}

module.exports = { evaluarPermiso, esOwnerPrincipal, mensajeDenegado }
