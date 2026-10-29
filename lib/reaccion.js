// Reacciones como "estado" de un comando largo: en vez de mandar "⏳ Descargando…" (un mensaje extra
// en el chat), se reacciona al mensaje de quien lo pidió: ⏳ mientras trabaja, ✅ al terminar, ❌ si falla.
async function reaccionar(sock, msg, emoji) {
  try { await sock.sendMessage(msg.key.remoteJid, { react: { text: emoji, key: msg.key } }) } catch { /* es solo decoración */ }
}

/** Ejecuta `trabajo` mostrando ⏳ → ✅/❌. Si la reacción no es posible, no pasa nada. */
async function conReaccion(sock, msg, trabajo) {
  await reaccionar(sock, msg, '⏳')
  try {
    const resultado = await trabajo()
    await reaccionar(sock, msg, '✅')
    return resultado
  } catch (error) {
    await reaccionar(sock, msg, '❌')
    throw error
  }
}

module.exports = { reaccionar, conReaccion }
