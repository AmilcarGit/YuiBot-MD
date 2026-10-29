// Límite de comandos por persona: evita que alguien (o un botón tocado diez veces) dispare
// docenas de respuestas seguidas. Más respuestas seguidas = más riesgo de bloqueo en WhatsApp.
//   - Ventana deslizante: como máximo MAX comandos cada VENTANA_MS por persona.
//   - Si ya hay uno IGUAL (mismo comando y argumentos) ejecutándose, el repetido se ignora.
//   - Se avisa una sola vez cada AVISO_MS; el resto se ignora en silencio (para no añadir más mensajes).
const POR_DEFECTO = { ENABLED: true, MAX: 6, VENTANA_MS: 10000, AVISO_MS: 30000 }

function crearLimiteComandos(opciones = {}) {
  const recientes = new Map() // persona → [horas]
  const avisos = new Map() // persona → última hora de aviso
  const enCurso = new Set()

  function limpiar(ahora, ventana) {
    if (recientes.size < 500) return
    for (const [k, horas] of recientes) if (!horas.length || ahora - horas[horas.length - 1] > ventana) recientes.delete(k)
    for (const [k, h] of avisos) if (ahora - h > 10 * 60 * 1000) avisos.delete(k)
  }

  /** @returns {{ok: true, liberar: Function} | {ok: false, motivo: 'rapido'|'repetido', avisar: boolean}} */
  function revisar(persona, comando, argumentos = '', { eximir = false, config = {}, ahora = Date.now() } = {}) {
    const cfg = { ...POR_DEFECTO, ...opciones, ...config }
    const sinLimite = { ok: true, liberar: () => {} }
    if (!cfg.ENABLED || eximir) return sinLimite

    const clave = `${persona}|${comando}|${String(argumentos).trim().toLowerCase()}`
    if (enCurso.has(clave)) return { ok: false, motivo: 'repetido', avisar: false }

    limpiar(ahora, cfg.VENTANA_MS)
    const horas = (recientes.get(persona) || []).filter((h) => ahora - h < cfg.VENTANA_MS)
    if (horas.length >= cfg.MAX) {
      recientes.set(persona, horas)
      const avisar = ahora - (avisos.get(persona) || 0) > cfg.AVISO_MS
      if (avisar) avisos.set(persona, ahora)
      return { ok: false, motivo: 'rapido', avisar }
    }
    horas.push(ahora)
    recientes.set(persona, horas)
    enCurso.add(clave)
    return { ok: true, liberar: () => enCurso.delete(clave) }
  }

  return { revisar, _estado: () => ({ personas: recientes.size, enCurso: enCurso.size }) }
}

module.exports = { crearLimiteComandos, POR_DEFECTO }
