// Código Oficial de YuiBot-MD.by AmilcarGit
// Utilidades de los comandos de grupo: a quién se refiere el mensaje y si el bot es admin.
import { soloNumero } from '../../nucleo/utiles.js'

const envoltura = c => c?.ephemeralMessage?.message || c

/** Personas nombradas con @ o a cuyo mensaje se responde. */
export function objetivos(m) {
  const contenido = envoltura(m.message) || {}
  const info = Object.values(contenido).map(v => v?.contextInfo).find(Boolean)
  const lista = new Set(info?.mentionedJid || [])
  if (info?.participant) lista.add(info.participant)
  return [...lista]
}

export const participanteDe = (meta, jid) => meta.participants.find(p => [p.id, p.lid, p.phoneNumber].includes(jid))

export function botEsAdmin(sock, meta) {
  const yo = [sock.user?.id, sock.user?.lid].filter(Boolean).map(soloNumero)
  return meta.participants.some(p => p.admin && [p.id, p.lid, p.phoneNumber].some(x => x && yo.includes(soloNumero(x))))
}
