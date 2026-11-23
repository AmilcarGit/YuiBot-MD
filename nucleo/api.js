// Código Oficial de YuiBot-MD.by AmilcarGit
// Cliente de YuiBot-datos (la base compartida). Cada instalación se identifica con { id, clave },
// que la API entrega una sola vez al registrarse y que se guarda en data/datos.json (no va al repo).
import ajustes from '../ajustes.js'

export const activa = () => Boolean(ajustes.datosUrl)

async function pedir(ruta, { metodo = 'GET', cuerpo, cred, espera = 15000 } = {}) {
  const cabeceras = { 'content-type': 'application/json' }
  if (cred) {
    cabeceras['x-instalacion'] = cred.id
    cabeceras['x-clave'] = cred.clave
  }
  const respuesta = await fetch(ajustes.datosUrl.replace(/\/$/, '') + ruta, {
    method: metodo,
    headers: cabeceras,
    body: metodo === 'GET' ? undefined : JSON.stringify(cuerpo ?? {}),
    signal: AbortSignal.timeout(espera)
  })
  const datos = await respuesta.json().catch(() => ({}))
  if (!respuesta.ok || datos.ok === false) {
    const error = new Error(datos.error || `API ${respuesta.status}`)
    error.estado = respuesta.status
    throw error
  }
  return datos
}

export const api = {
  salud: () => pedir('/api/salud'),
  registrar: () => pedir('/api/registrar', { metodo: 'POST' }),
  sync: (cred, cuerpo) => pedir('/api/sync', { metodo: 'POST', cuerpo, cred }),
  vincular: (cred, numero) => pedir('/api/vincular', { metodo: 'POST', cuerpo: { numero }, cred }),
  top: (campo = 'xp', limite = 10) => pedir(`/api/top?campo=${encodeURIComponent(campo)}&limite=${limite}`, { espera: 6000 }),
  usuario: numero => pedir(`/api/usuario?numero=${encodeURIComponent(numero)}`, { espera: 6000 }),
  evento: () => pedir('/api/evento', { espera: 6000 }),
  estadisticas: () => pedir('/api/estadisticas', { espera: 6000 })
}
