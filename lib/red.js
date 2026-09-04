//CÓDIGO ORIGINAL DE YUIBOT-MD
const fs = require('fs')
const path = require('path')

const CARPETA_RED = path.join(__dirname, '..', 'data', 'red')
const RUTA_HEARTBEATS = path.join(CARPETA_RED, 'heartbeats.json')
const RUTA_GRUPOS_PRINCIPAL = path.join(CARPETA_RED, 'principal-grupos.json')
const CARPETA_LOCKS = path.join(CARPETA_RED, 'locks')

const HEARTBEAT_INTERVAL_MS = 15000
const HEARTBEAT_TTL_MS = 45000
const GRUPOS_TTL_MS = 60000

const ID_PRINCIPAL = 'PRINCIPAL'

function asegurarCarpetas() {
  if (!fs.existsSync(CARPETA_RED)) fs.mkdirSync(CARPETA_RED, { recursive: true })
  if (!fs.existsSync(CARPETA_LOCKS)) fs.mkdirSync(CARPETA_LOCKS, { recursive: true })
}

function leerJSON(ruta, porDefecto) {
  asegurarCarpetas()
  try {
    if (!fs.existsSync(ruta)) return porDefecto
    return JSON.parse(fs.readFileSync(ruta, 'utf-8'))
  } catch {
    return porDefecto
  }
}

function escribirJSON(ruta, data) {
  asegurarCarpetas()
  fs.writeFileSync(ruta, JSON.stringify(data, null, 2))
}

function actualizarHeartbeat(id) {
  const data = leerJSON(RUTA_HEARTBEATS, {})
  data[id] = Date.now()
  escribirJSON(RUTA_HEARTBEATS, data)
}

function heartbeatFresco(id, ttl = HEARTBEAT_TTL_MS) {
  const data = leerJSON(RUTA_HEARTBEATS, {})
  const ts = data[id]
  if (!ts) return false
  return (Date.now() - ts) <= ttl
}

function iniciarHeartbeat(id) {
  actualizarHeartbeat(id)
  const intervalo = setInterval(() => actualizarHeartbeat(id), HEARTBEAT_INTERVAL_MS)
  return () => clearInterval(intervalo)
}

async function actualizarGruposPrincipal(sock) {
  try {
    const grupos = await sock.groupFetchAllParticipating()
    const ids = Object.keys(grupos)
    escribirJSON(RUTA_GRUPOS_PRINCIPAL, { grupos: ids, actualizado: Date.now() })
  } catch (error) {
    console.error('[NETWORK] No se pudo refrescar la lista de grupos del principal:', error.message)
  }
}

function principalPresenteEnGrupo(groupId) {
  if (!heartbeatFresco(ID_PRINCIPAL)) return false
  const info = leerJSON(RUTA_GRUPOS_PRINCIPAL, null)
  if (!info) return false
  if ((Date.now() - info.actualizado) > GRUPOS_TTL_MS) return false
  return info.grupos.includes(groupId)
}

const estadoLoggeado = new Map()

function logSiCambia(groupId, estado, mensaje) {
  if (estadoLoggeado.get(groupId) === estado) return
  estadoLoggeado.set(groupId, estado)
  console.log(`[NETWORK] ${mensaje}`)
}

function rutaLock(groupId) {
  const nombreArchivo = groupId.replace(/[^a-zA-Z0-9._-]/g, '_')
  return path.join(CARPETA_LOCKS, `${nombreArchivo}.json`)
}

function leerLock(groupId) {
  const ruta = rutaLock(groupId)
  try {
    if (!fs.existsSync(ruta)) return null
    return JSON.parse(fs.readFileSync(ruta, 'utf-8'))
  } catch {
    return null
  }
}

function intentarAdquirirLock(groupId, numero) {
  asegurarCarpetas()
  const ruta = rutaLock(groupId)
  const contenido = JSON.stringify({ owner: numero, ts: Date.now() })
  try {
    fs.writeFileSync(ruta, contenido, { flag: 'wx' })
    return true
  } catch (error) {
    if (error.code === 'EEXIST') return false
    console.error('[NETWORK] Error inesperado adquiriendo LOCK:', error.message)
    return false
  }
}

function puedeResponderSubbot(numero, groupId) {
  if (principalPresenteEnGrupo(groupId)) {
    logSiCambia(groupId, 'principal', `Principal detectado en grupo ${groupId}: subbot ${numero} en espera.`)
    return false
  }

  const lock = leerLock(groupId)

  if (lock && heartbeatFresco(lock.owner)) {
    if (lock.owner === numero) {
      logSiCambia(groupId, `lider:${numero}`, `Subbot ${numero} mantiene el LOCK del grupo ${groupId}.`)
      return true
    }
    logSiCambia(groupId, `esperando:${lock.owner}`, `Subbot ${numero} ignorado: LOCK pertenece a ${lock.owner}.`)
    return false
  }

  if (lock) {
    try { fs.unlinkSync(rutaLock(groupId)) } catch {}
    console.log(`[NETWORK] LOCK del grupo ${groupId} expiró (${lock.owner} sin heartbeat). Liberado.`)
  }

  console.log(`[NETWORK] Subbot ${numero} intentando adquirir LOCK del grupo ${groupId}...`)
  const gane = intentarAdquirirLock(groupId, numero)

  if (gane) {
    logSiCambia(groupId, `lider:${numero}`, `LOCK adquirido por ${numero} en grupo ${groupId}.`)
    return true
  }

  logSiCambia(groupId, 'perdido-race', `Subbot ${numero} no obtuvo el LOCK (otro subbot lo ganó primero).`)
  return false
}

module.exports = {
  ID_PRINCIPAL,
  iniciarHeartbeat,
  actualizarGruposPrincipal,
  principalPresenteEnGrupo,
  puedeResponderSubbot,
}