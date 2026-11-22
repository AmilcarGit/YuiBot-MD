// Código Oficial de YuiBot-MD.by AmilcarGit
const enlaceGrupo = /chat\.whatsapp\.com\/[A-Za-z0-9]{10,}/i

export async function vigilar(ctx) {
  const { chat, grupo, esAdmin, esDueno, texto, sock, m, jid } = ctx
  if (!grupo || esAdmin || esDueno) return false
  if (chat.antienlaces && enlaceGrupo.test(texto)) {
    await sock.sendMessage(jid, { delete: m.key }).catch(() => {})
    await ctx.responder('No se permiten enlaces de otros grupos.')
    return true
  }
  return false
}
