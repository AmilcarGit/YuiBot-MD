// Código Oficial de YuiBot-MD.by AmilcarGit
import ajustes from '../ajustes.js'

export const activa = () => Boolean(ajustes.datosUrl)

async function pedir(ruta, opciones = {}) {
  const cabeceras = { 'content-type': 'application/json' }
  if (ajustes.datosClave) cabeceras.authorization = `Bearer ${ajustes.datosClave}`
  const respuesta = await fetch(ajustes.datosUrl.replace(/\/$/, '') + ruta, {
    ...opciones,
    headers: cabeceras,
    signal: AbortSignal.timeout(15000)
  })
  if (!respuesta.ok) throw new Error(`API ${respuesta.status}`)
  return respuesta.json()
}

const enviar = (ruta, datos) => pedir(ruta, { method: 'POST', body: JSON.stringify(datos) })

export const api = {
  salud: () => pedir('/api/salud'),
  registrar: datos => enviar('/api/registrar', datos),
  sync: datos => enviar('/api/sync', datos),
  top: () => pedir('/api/top'),
  usuario: id => pedir(`/api/usuario?id=${encodeURIComponent(id)}`),
  evento: () => pedir('/api/evento'),
  estadisticas: () => pedir('/api/estadisticas')
}
