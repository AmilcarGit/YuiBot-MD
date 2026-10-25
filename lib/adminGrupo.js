// Utilidades compartidas por los comandos de administración de grupos.
const { isOwner } = require('./handler')
const { obtenerGrupo, guardarGrupo } = require('./db')

const MAX_WARNS_DEFECTO = 3

function limpiar(jid) {
  return String(jid || '').split('@')[0].split(':')[0]
}

function participante(metadata, ...candidatos) {
  const nums = candidatos.filter(Boolean).map(limpiar)
  return metadata.participants.find((p) => nums.includes(limpiar(p.id)) || nums.includes(limpiar(p.phoneNumber)) || nums.includes(limpiar(p.lid)))
}

const esAdmin = (p) => p?.admin === 'admin' || p?.admin === 'superadmin'

/**
 * Valida que sea un grupo y que quien escribe sea admin (u owner del bot).
 * Devuelve { metadata, soyAdmin } o null después de responder el error.
 */
async function exigirAdmin(sock, msg, config, { botAdmin = false } = {}) {
  const jid = msg.key.remoteJid
  const responder = (text) => sock.sendMessage(jid, { text }, { quoted: msg })
  if (!jid.endsWith('@g.us')) { await responder('❌ Este comando solo funciona en grupos.'); return null }

  let metadata
  try { metadata = await sock.groupMetadata(jid) } catch {
    await responder('❌ No se pudo obtener la información del grupo.'); return null
  }
  const remitente = msg.key.participantAlt || msg.key.participant
  const quien = participante(metadata, msg.key.participant, msg.key.participantAlt)
  if (!esAdmin(quien) && !isOwner(remitente, config)) {
    await responder('⛔ Solo los administradores del grupo pueden usar este comando.'); return null
  }
  if (botAdmin) {
    const yo = participante(metadata, sock.user?.id, sock.user?.lid)
    if (!esAdmin(yo)) { await responder('⚠️ Necesito ser administrador del grupo para hacer eso.'); return null }
  }
  return { metadata, jid }
}

// Objetivo: cita > mención > número escrito.
function objetivoDe(msg, args = []) {
  const info = msg.message?.extendedTextMessage?.contextInfo
  const jid = info?.mentionedJid?.[0] || info?.participant
  if (jid) return limpiar(jid)
  const num = String(args.find((a) => /\d{6,}/.test(a)) || '').replace(/\D/g, '')
  return num || null
}

function leerWarns(jid) {
  return { ...(obtenerGrupo(jid)?.warns || {}) }
}

function agregarWarn(jid, numero, motivo, max = MAX_WARNS_DEFECTO) {
  const warns = leerWarns(jid)
  const actual = warns[numero] || { total: 0, motivos: [] }
  const nuevo = { total: actual.total + 1, motivos: [...actual.motivos, String(motivo || 'Sin motivo').slice(0, 100)].slice(-10) }
  const llego = nuevo.total >= max
  if (llego) delete warns[numero]
  else warns[numero] = nuevo
  guardarGrupo(jid, { warns })
  return { total: nuevo.total, max, llego }
}

function quitarWarn(jid, numero) {
  const warns = leerWarns(jid)
  const actual = warns[numero]
  if (!actual) return null
  if (actual.total <= 1) delete warns[numero]
  else warns[numero] = { total: actual.total - 1, motivos: actual.motivos.slice(0, -1) }
  guardarGrupo(jid, { warns })
  return actual.total - 1
}

module.exports = { limpiar, participante, esAdmin, exigirAdmin, objetivoDe, leerWarns, agregarWarn, quitarWarn, MAX_WARNS_DEFECTO }
