//CÓDIGO ORIGINAL DE YUIBOT-MD
// Controlador de reconexión robusto, compartido por main.js (bot principal)
// y subbot.js (subbots). Antes cada uno tenía su propia lógica de
// reconexión (un setTimeout fijo de 5s en subbot.js, un reconnect
// inmediato en main.js), sin backoff ni protección ante el error 405
// de WhatsApp (que castiga con más fuerza si se insiste rápido).
//
// Patrón inspirado en fsociety-Baileys/bot.js y en la casuística de
// reconexión de fsociety-bot/index.js, adaptado al estilo de YuiBot-MD.

const BASE_DELAY_MS = 2000
const MAX_DELAY_MS = 30000
const JITTER_RATIO = 0.2
const COOLDOWN_405_MS = 40 * 60 * 1000 // 40 min, igual que fsociety-Baileys
const GUARD_PAIRING_MS = 15 * 1000     // evita pedir pairing code en ráfaga

/**
 * Crea un controlador de reconexión para un socket (bot principal o subbot).
 *
 * @param {object} opciones
 * @param {string} opciones.etiqueta - Nombre para los logs (ej: "principal" o "subbot 519...").
 * @param {() => Promise<any>} opciones.reiniciar - Función que vuelve a levantar el socket.
 * @param {(texto: string) => void} [opciones.log] - Logger opcional (default: console.warn).
 */
function crearControladorReconexion({ etiqueta, reiniciar, log }) {
  const logger = typeof log === 'function' ? log : (texto) => console.warn(texto)

  let intentos = 0
  let timer = null
  let cooldownHasta = 0
  let ultimoIntentoPairingEn = 0

  function limpiarTimer() {
    if (timer) {
      clearTimeout(timer)
      timer = null
    }
  }

  function programar(delayMs) {
    if (timer) return // ya hay una reconexión programada, no duplicar
    timer = setTimeout(() => {
      timer = null
      reiniciar().catch((err) => console.error(`❌ [RECONEXION] ${etiqueta} falló al reiniciar:`, err))
    }, Math.max(0, Math.round(delayMs)))
  }

  /**
   * Debe llamarse cuando el socket se cierra (evento connection.update con connection === 'close').
   * @param {object} info
   * @param {number} [info.statusCode] - Código HTTP/WhatsApp del cierre (401, 405, 440, etc).
   * @param {string} [info.mensaje] - Texto del error, si existe.
   */
  function manejarCierre({ statusCode, mensaje } = {}) {
    const ahora = Date.now()

    if (statusCode === 405) {
      cooldownHasta = ahora + COOLDOWN_405_MS
      logger(`⏳ [RECONEXION] ${etiqueta} recibió 405 de WhatsApp. Pauso reintentos ${Math.ceil(COOLDOWN_405_MS / 60000)} min para no forzar la cuenta.`)
      programar(COOLDOWN_405_MS)
      return
    }

    if (cooldownHasta > ahora) {
      const restante = cooldownHasta - ahora
      logger(`⏳ [RECONEXION] ${etiqueta} sigue en cooldown por ~${Math.ceil(restante / 60000)} min.`)
      programar(restante)
      return
    }

    intentos += 1
    const exponente = Math.max(0, intentos - 1)
    const base = Math.min(BASE_DELAY_MS * 2 ** exponente, MAX_DELAY_MS)
    const jitter = base * JITTER_RATIO * Math.random()
    const delay = base + jitter

    logger(`🔁 [RECONEXION] ${etiqueta} programando reintento #${intentos} en ${Math.ceil(delay / 1000)}s.${mensaje ? ` Motivo: ${mensaje}.` : ''}`)
    programar(delay)
  }

  /** Debe llamarse cuando la conexión abre correctamente (connection === 'open'). */
  function conexionExitosa() {
    intentos = 0
    cooldownHasta = 0
    limpiarTimer()
  }

  /**
   * ¿Puedo pedir un pairing code ahora, o debo esperar (cooldown 405 activo
   * o ya se pidió uno hace muy poco)?
   * @returns {{ permitido: boolean, motivo?: string, esperaMs?: number }}
   */
  function puedeIntentarPairing() {
    const ahora = Date.now()

    if (cooldownHasta > ahora) {
      return { permitido: false, motivo: 'cooldown_405', esperaMs: cooldownHasta - ahora }
    }

    if (ahora - ultimoIntentoPairingEn < GUARD_PAIRING_MS) {
      return { permitido: false, motivo: 'demasiado_rapido', esperaMs: GUARD_PAIRING_MS - (ahora - ultimoIntentoPairingEn) }
    }

    return { permitido: true }
  }

  /** Marca que se acaba de intentar pedir un pairing code (para el guard anti-ráfaga). */
  function marcarIntentoPairing() {
    ultimoIntentoPairingEn = Date.now()
  }

  /** Si el pairing code mismo devuelve 405 (no la conexión), también activa el cooldown. */
  function registrarPairing405() {
    cooldownHasta = Date.now() + COOLDOWN_405_MS
    logger(`⏳ [RECONEXION] ${etiqueta} recibió 405 al pedir pairing code. Pauso ${Math.ceil(COOLDOWN_405_MS / 60000)} min.`)
  }

  function detener() {
    limpiarTimer()
  }

  return {
    manejarCierre,
    conexionExitosa,
    puedeIntentarPairing,
    marcarIntentoPairing,
    registrarPairing405,
    detener,
  }
}

module.exports = { crearControladorReconexion }