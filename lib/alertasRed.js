// Vigila los latidos de los subbots (solo lo corre el bot principal) y avisa a
// los owners cuando uno se cae o se recupera.
const { listarHeartbeats, ID_PRINCIPAL } = require('./red')

const INTERVALO_MS = 30000

// Compara el estado anterior con el actual y devuelve los avisos.
function detectarCambios(previo, actual) {
  const avisos = []
  for (const hb of actual) {
    if (hb.id === ID_PRINCIPAL) continue
    const antes = previo.get(hb.id)
    if (antes === true && !hb.vivo) avisos.push({ id: hb.id, tipo: 'caido' })
    if (antes === false && hb.vivo) avisos.push({ id: hb.id, tipo: 'recuperado' })
  }
  return avisos
}

function textoAviso(a) {
  return a.tipo === 'caido'
    ? `🔴 El subbot +${a.id} dejó de responder (sin latido).`
    : `🟢 El subbot +${a.id} volvió a conectarse.`
}

function iniciar(sock, owners, leerLatidos = listarHeartbeats) {
  const previo = new Map(leerLatidos().map((h) => [h.id, h.vivo]))
  const t = setInterval(async () => {
    try {
      const actual = leerLatidos()
      const avisos = detectarCambios(previo, actual)
      for (const h of actual) previo.set(h.id, h.vivo)
      for (const a of avisos) {
        for (const o of owners) {
          await sock.sendMessage(`${o.numero}@s.whatsapp.net`, { text: textoAviso(a) }).catch(() => {})
        }
      }
    } catch (e) {
      console.error('[ALERTAS-RED]', e.message)
    }
  }, INTERVALO_MS)
  if (t.unref) t.unref()
  return () => clearInterval(t)
}

module.exports = { detectarCambios, textoAviso, iniciar, INTERVALO_MS }
