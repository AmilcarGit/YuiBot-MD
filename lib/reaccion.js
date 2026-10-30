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

// Estado por mensaje para los comandos que reaccionan en dos tiempos (iniciar → fallar | finalizar).
// Se guarda en un WeakSet para que no ocupe memoria cuando el mensaje ya no se usa.
const pendientes = new WeakSet()
const llave = (msg) => (msg && typeof msg === 'object' ? msg : null)

/** Pone ⏳ al mensaje del usuario (una sola vez por comando). */
async function iniciar(sock, msg, emoji = '⏳') {
  const m = llave(msg)
  if (!m || pendientes.has(m)) return
  pendientes.add(m)
  await reaccionar(sock, msg, emoji)
}

/** Cambia la reacción a ❌ si el comando había empezado. */
async function fallar(sock, msg) {
  const m = llave(msg)
  if (!m || !pendientes.has(m)) return
  pendientes.delete(m)
  await reaccionar(sock, msg, '❌')
}

/** Cambia la reacción a ✅ si el comando había empezado y no falló. */
async function finalizar(sock, msg) {
  const m = llave(msg)
  if (!m || !pendientes.has(m)) return
  pendientes.delete(m)
  await reaccionar(sock, msg, '✅')
}

/**
 * Envuelve un módulo de comando: al terminar `execute` deja ✅ si usó `iniciar` y no `fallar`.
 * Si `execute` lanza un error, deja ❌ y lo vuelve a lanzar (el handler sigue avisando como siempre).
 */
function conEstado(modulo) {
  const original = modulo.execute
  modulo.execute = async function execute(sock, msg, ...resto) {
    try {
      const resultado = await original.call(this, sock, msg, ...resto)
      await finalizar(sock, msg)
      return resultado
    } catch (error) {
      await fallar(sock, msg)
      throw error
    }
  }
  return modulo
}

module.exports = { reaccionar, conReaccion, iniciar, fallar, finalizar, conEstado }
