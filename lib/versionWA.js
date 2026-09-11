//CÓDIGO ORIGINAL DE YUIBOT-MD
// Resuelve qué versión de WhatsApp Web usar al conectar, con triple fallback:
//   1) fetchLatestWaWebVersion  (la más precisa; la trae fsociety-Baileys)
//   2) fetchLatestBaileysVersion (la que ya usábamos antes)
//   3) una versión fija conocida, por si ambas fallan (ej: sin internet
//      en ese instante, o el endpoint de versión está caído)
//
// Patrón tomado de fsociety-Baileys/bot.js, adaptado al estilo de YuiBot-MD.

// Actualízala de vez en cuando revisando la constante FALLBACK_VERSION
// de fsociety-Baileys/bot.js o whatsmeow/otros clientes.
const FALLBACK_VERSION = [2, 3000, 1023223821]

/**
 * @param {object} baileys - El objeto ya desestructurado con las funciones
 *   fetchLatestWaWebVersion y fetchLatestBaileysVersion (una o ambas pueden
 *   no existir según el fork de Baileys instalado).
 * @param {(texto: string) => void} [log] - Logger opcional (default: console.warn).
 * @returns {Promise<number[]>}
 */
async function resolverVersionWA(baileys, log) {
  const logger = typeof log === 'function' ? log : (texto) => console.warn(texto)

  if (typeof baileys?.fetchLatestWaWebVersion === 'function') {
    try {
      const { version } = await baileys.fetchLatestWaWebVersion()
      if (Array.isArray(version)) return version
    } catch (error) {
      logger(`[VERSION] fetchLatestWaWebVersion falló (${error.message}), probando fetchLatestBaileysVersion.`)
    }
  }

  if (typeof baileys?.fetchLatestBaileysVersion === 'function') {
    try {
      const { version } = await baileys.fetchLatestBaileysVersion()
      if (Array.isArray(version)) return version
    } catch (error) {
      logger(`[VERSION] fetchLatestBaileysVersion también falló (${error.message}), uso la versión fija de respaldo.`)
    }
  }

  logger(`[VERSION] Usando versión fija de respaldo: ${FALLBACK_VERSION.join('.')}`)
  return FALLBACK_VERSION
}

module.exports = { resolverVersionWA, FALLBACK_VERSION }