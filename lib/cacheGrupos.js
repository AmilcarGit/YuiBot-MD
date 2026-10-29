// Caché de los datos de grupo (nombre, participantes, admins).
//
// Sin esto, el bot le pide a WhatsApp los datos del grupo CADA VEZ que responde en uno
// (para saber a quién cifrar el mensaje) y también en cada comando de admin. Eso suma
// una ida y vuelta al servidor por mensaje: más lento, más tráfico "sospechoso" y fuente
// del error "missing <group> node". Aquí se guardan unos minutos y se renuevan solos
// cuando alguien entra, sale, es promovido o cambia el grupo.

const TTL_MS = 5 * 60 * 1000 // cuánto se considera fresco
const VIDA_MAX_MS = 60 * 60 * 1000 // si WhatsApp falla, se usa la copia vieja hasta esta edad
const MAX_GRUPOS = 300

function crearCacheGrupos({ ttlMs = TTL_MS, vidaMaxMs = VIDA_MAX_MS, ahora = () => Date.now() } = {}) {
  const guardados = new Map() // jid → { meta, hora }
  const pendientes = new Map() // jid → Promise (varias peticiones iguales comparten una sola)
  const estadisticas = { aciertos: 0, fallos: 0, rescatados: 0 }

  const poner = (jid, meta) => {
    guardados.set(jid, { meta, hora: ahora() })
    if (guardados.size > MAX_GRUPOS) guardados.delete(guardados.keys().next().value)
  }

  const fresco = (jid) => {
    const g = guardados.get(jid)
    return g && ahora() - g.hora < ttlMs ? g.meta : null
  }

  async function obtener(jid, buscar) {
    const f = fresco(jid)
    if (f) { estadisticas.aciertos++; return f }
    if (pendientes.has(jid)) return pendientes.get(jid)
    estadisticas.fallos++
    const promesa = (async () => {
      try {
        const meta = await buscar()
        if (meta) poner(jid, meta)
        return meta
      } catch (error) {
        const viejo = guardados.get(jid)
        if (viejo && ahora() - viejo.hora < vidaMaxMs) { estadisticas.rescatados++; return viejo.meta }
        throw error
      } finally {
        pendientes.delete(jid)
      }
    })()
    pendientes.set(jid, promesa)
    return promesa
  }

  const invalidar = (jid) => { if (jid) guardados.delete(jid) }

  /**
   * Conecta la caché a un socket de Baileys: `sock.groupMetadata` pasa a usarla y se
   * renueva con los eventos del grupo. Devuelve la función para la opción `cachedGroupMetadata`.
   */
  function instalar(sock) {
    const original = sock.groupMetadata.bind(sock)
    sock.groupMetadata = (jid) => obtener(jid, () => original(jid))
    sock.ev.on('groups.update', (cambios) => { for (const c of cambios || []) invalidar(c?.id) })
    sock.ev.on('group-participants.update', (u) => invalidar(u?.id))
    sock.ev.on('groups.upsert', (grupos) => { for (const g of grupos || []) if (g?.id) poner(g.id, g) })
    return async (jid) => {
      try { return await sock.groupMetadata(jid) } catch { return undefined } // si falla, Baileys lo pide por su cuenta
    }
  }

  return { obtener, invalidar, instalar, estado: () => ({ ...estadisticas, grupos: guardados.size }), _guardados: guardados }
}

module.exports = { crearCacheGrupos, TTL_MS }
