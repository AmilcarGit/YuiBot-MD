// Código Oficial de YuiBot-MD.by AmilcarGit
import { dice, mal } from '../estilo/index.js'

const enlaceGrupo = /chat\.whatsapp\.com\/[A-Za-z0-9]{10,}/i

export async function vigilar(ctx) {
  const { chat, grupo, esAdmin, esDueno, texto, sock, m, jid } = ctx
  if (!grupo || esAdmin || esDueno) return false
  if (chat.antienlaces && enlaceGrupo.test(texto)) {
    await sock.sendMessage(jid, { delete: m.key }).catch(() => {})
    await ctx.responder(mal(dice('antienlaces')))
    return true
  }
  return false
}
