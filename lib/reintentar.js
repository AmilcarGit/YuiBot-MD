// Reintenta una operación que falla por motivos pasajeros (subida de media a
// los servidores de WhatsApp, cortes de red). Los errores "de verdad"
// (archivo inválido, permisos...) no se reintentan.

const ERRORES_PASAJEROS = /upload failed|media upload|timed? ?out|timeout|ENOTFOUND|getaddrinfo|ECONNRESET|ECONNREFUSED|ETIMEDOUT|EAI_AGAIN|fetch failed|Connection Closed|socket hang up|Internal Server Error|\b50[0234]\b/i

function esErrorPasajero(error) {
  const texto = [error?.message, error?.code, error?.cause?.code, error?.output?.statusCode].filter(Boolean).join(' ')
  return ERRORES_PASAJEROS.test(texto)
}

async function reintentar(operacion, { intentos = 3, esperaMs = 2000, debeReintentar = esErrorPasajero } = {}) {
  let ultimoError
  for (let intento = 1; intento <= intentos; intento++) {
    try {
      return await operacion(intento)
    } catch (error) {
      ultimoError = error
      if (intento >= intentos || !debeReintentar(error)) throw error
      await new Promise((resolve) => setTimeout(resolve, esperaMs * intento))
    }
  }
  throw ultimoError
}

module.exports = { reintentar, esErrorPasajero }
