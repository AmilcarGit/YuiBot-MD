// fetch con timeouts por defecto.
//
// El fetch de Node no tiene ningún timeout: si una API externa se cuelga, el
// comando se queda esperando para siempre (y con el circuit breaker ni
// siquiera cuenta como fallo). Este envoltorio añade:
//   - HEADERS_MS: tiempo máximo para recibir la RESPUESTA (los headers).
//   - TOTAL_MS:   tope absoluto de toda la petición, incluida la descarga del
//                 cuerpo (alto, para no cortar descargas grandes de media).
//
// Se usa como `const fetch = require('.../lib/http').fetchSeguro` al inicio de
// cada módulo, y NO reemplaza globalThis.fetch a propósito: Baileys también
// usa fetch para subir/descargar media (la respuesta llega recién después de
// subir el archivo) y no debe heredar estos límites.
//
// Si quien llama ya pasa su propio `signal`, se respeta tal cual (él decide).

const HEADERS_MS = 30 * 1000
const TOTAL_MS = 5 * 60 * 1000

function nombreHost(entrada) {
  try {
    const url = typeof entrada === 'string' ? entrada : entrada?.url || String(entrada)
    return new URL(url).host
  } catch {
    return 'el servidor'
  }
}

// Fábrica: permite crear versiones con otros tiempos (se usa en las pruebas).
function crearFetchSeguro({ headersMs = HEADERS_MS, totalMs = TOTAL_MS } = {}) {
  return function fetchSeguro(entrada, opciones = {}) {
    if (opciones?.signal) return globalThis.fetch(entrada, opciones)

    const controlador = new AbortController()
    const host = nombreHost(entrada)

    const temporizadorHeaders = setTimeout(() => {
      controlador.abort(new Error(`Tiempo de espera agotado esperando respuesta de ${host} (${headersMs / 1000}s).`))
    }, headersMs)

    const temporizadorTotal = setTimeout(() => {
      controlador.abort(new Error(`La petición a ${host} superó el límite total de ${totalMs / 60000} min.`))
    }, totalMs)

    // No deben mantener vivo el proceso (ni retrasar un cierre) por sí solos.
    temporizadorHeaders.unref?.()
    temporizadorTotal.unref?.()

    return globalThis.fetch(entrada, { ...opciones, signal: controlador.signal }).then(
      (respuesta) => {
        // Ya llegaron los headers: se libera el límite corto. El total sigue
        // protegiendo contra un cuerpo que se queda colgado.
        clearTimeout(temporizadorHeaders)
        return respuesta
      },
      (error) => {
        clearTimeout(temporizadorHeaders)
        clearTimeout(temporizadorTotal)
        throw error
      }
    )
  }
}

const fetchSeguro = crearFetchSeguro()

module.exports = { fetchSeguro, crearFetchSeguro, HEADERS_MS, TOTAL_MS }
