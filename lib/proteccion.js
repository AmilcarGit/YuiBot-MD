// Protección del bot: anti-llamadas y anti-privado.
//
// La configuración es POR BOT (el bot principal es "principal" y cada subbot
// usa su número), así un subbot no cambia lo que hace el principal.
// Se guarda en data/proteccion.json.
//
//   anticall:    rechaza las llamadas (y avisa). Con "bloquear", bloquea a quien
//                insiste varias veces seguidas.
//   antiprivado: los chats privados de usuarios normales no ejecutan comandos
//                (solo avisa). Los owners y los comandos permitidos siguen igual.

const fs = require('fs')
const path = require('path')
const { escribirJSONAtomico } = require('./escrituraAtomica')
const { isOwner, obtenerCandidatosPropietario } = require('./handler')

const RUTA = path.join(__dirname, '..', 'data', 'proteccion.json')

const POR_DEFECTO = {
  anticall: {
    activo: false,
    bloquear: false,
    mensaje: '📵 *No atiendo llamadas.*\n\nEscríbeme por mensaje y con gusto te ayudo.',
  },
  antiprivado: {
    activo: false,
    bloquear: false,
    mensaje: '🔒 *Este bot solo atiende en grupos.*\n\nAgrégame a tu grupo para usar mis comandos.',
  },
}

const VENTANA_INSISTENCIA_MS = 10 * 60 * 1000
const COOLDOWN_AVISO_MS = 5 * 60 * 1000
const COOLDOWN_AVISO_PRIVADO_MS = 6 * 60 * 60 * 1000

function leerTodo() {
  try {
    const datos = JSON.parse(fs.readFileSync(RUTA, 'utf-8'))
    return datos && typeof datos === 'object' && !Array.isArray(datos) ? datos : {}
  } catch {
    return {}
  }
}

function obtener(idBot = 'principal') {
  const guardado = leerTodo()[String(idBot)] || {}
  return {
    anticall: { ...POR_DEFECTO.anticall, ...(guardado.anticall || {}) },
    antiprivado: { ...POR_DEFECTO.antiprivado, ...(guardado.antiprivado || {}) },
  }
}

function actualizar(idBot, seccion, campos) {
  if (!POR_DEFECTO[seccion]) throw new Error(`Sección desconocida: ${seccion}`)
  const id = String(idBot || 'principal')
  const todo = leerTodo()
  const actual = obtener(id)
  todo[id] = { ...actual, [seccion]: { ...actual[seccion], ...campos } }
  fs.mkdirSync(path.dirname(RUTA), { recursive: true })
  escribirJSONAtomico(RUTA, todo)
  return todo[id][seccion]
}

// ── Contadores en memoria (insistencia y avisos recientes) ──
const eventos = new Map() // clave -> [horas]
const avisos = new Map() // clave -> hasta cuándo no avisar de nuevo

function contarEvento(clave, ventanaMs = VENTANA_INSISTENCIA_MS, ahora = Date.now()) {
  const recientes = (eventos.get(clave) || []).filter((t) => ahora - t < ventanaMs)
  recientes.push(ahora)
  eventos.set(clave, recientes)
  return recientes.length
}

function puedeAvisar(clave, cooldownMs, ahora = Date.now()) {
  if (ahora < (avisos.get(clave) || 0)) return false
  avisos.set(clave, ahora + cooldownMs)
  return true
}

function limpiarMemoria() {
  eventos.clear()
  avisos.clear()
}

/** ¿Quien escribió es dueño del bot (owner principal, o dueño de ese subbot)? */
function esPropietarioDelBot(sock, msg, config, idBot = 'principal') {
  const candidatos = obtenerCandidatosPropietario(sock, msg)
  if (candidatos.some((jid) => isOwner(jid, config))) return true
  if (idBot !== 'principal') {
    const { esDuenoDeSubbot } = require('./subbots')
    return esDuenoDeSubbot(idBot, candidatos)
  }
  return false
}

const numeroDe = (jid) => String(jid || '').split('@')[0].split(':')[0]

/**
 * Evento 'call' de Baileys. Solo actúa sobre llamadas entrantes (offer).
 * @returns {Promise<'rechazada'|'ignorada'>}
 */
async function manejarLlamada(sock, llamada, { idBot = 'principal', config, ahora = Date.now() } = {}) {
  if (!llamada || llamada.status !== 'offer' || !llamada.from) return 'ignorada'

  const ajustes = obtener(idBot).anticall
  if (!ajustes.activo) return 'ignorada'
  if (isOwner(llamada.from, config) || (idBot !== 'principal' && require('./subbots').esDuenoDeSubbot(idBot, [llamada.from]))) return 'ignorada'

  await sock.rejectCall(llamada.id, llamada.from)

  const clave = `llamada|${idBot}|${numeroDe(llamada.from)}`
  const veces = contarEvento(clave, VENTANA_INSISTENCIA_MS, ahora)

  if (ajustes.bloquear && veces >= (config?.PROTECCION?.MAX_LLAMADAS || 3)) {
    await sock.updateBlockStatus(llamada.from, 'block').catch((e) => console.error('[ANTICALL] No se pudo bloquear:', e.message))
    return 'rechazada'
  }

  if (puedeAvisar(clave, COOLDOWN_AVISO_MS, ahora)) {
    await sock.sendMessage(llamada.chatId || llamada.from, { text: ajustes.mensaje }).catch(() => {})
  }
  return 'rechazada'
}

/**
 * ¿Hay que frenar este mensaje por antiprivado? Devuelve true si se debe
 * frenar (el hook tiene que devolver true). Avisa y, si está configurado,
 * bloquea a quien insiste.
 */
async function aplicarAntiprivado(sock, msg, ctx, { ahora = Date.now() } = {}) {
  const { jid, config, idBot = 'principal', body } = ctx
  if (msg.key.fromMe || !jid || jid.endsWith('@g.us') || jid === 'status@broadcast' || jid.endsWith('@newsletter') || jid.endsWith('@broadcast')) return false

  const ajustes = obtener(idBot).antiprivado
  if (!ajustes.activo) return false
  if (esPropietarioDelBot(sock, msg, config, idBot)) return false

  // Comandos que se dejan pasar en privado (por defecto solo .code, para pedir un subbot).
  const permitidos = config?.PROTECCION?.COMANDOS_PRIVADO_PERMITIDOS || ['code']
  const palabra = String(body || '').trim().split(/\s+/)[0]?.toLowerCase() || ''
  const prefijo = (config?.PREFIXES || []).find((p) => palabra.startsWith(p))
  const comando = prefijo ? palabra.slice(prefijo.length) : palabra
  if (comando && permitidos.includes(comando)) return false

  const clave = `privado|${idBot}|${numeroDe(jid)}`
  const insistencias = contarEvento(clave, 60 * 60 * 1000, ahora)

  if (ajustes.bloquear && insistencias >= (config?.PROTECCION?.MAX_INSISTENCIAS || 5)) {
    await sock.updateBlockStatus(jid, 'block').catch((e) => console.error('[ANTIPRIVADO] No se pudo bloquear:', e.message))
    return true
  }

  if (puedeAvisar(clave, COOLDOWN_AVISO_PRIVADO_MS, ahora)) {
    await sock.sendMessage(jid, { text: ajustes.mensaje }).catch(() => {})
  }
  return true
}

module.exports = {
  obtener,
  actualizar,
  manejarLlamada,
  aplicarAntiprivado,
  esPropietarioDelBot,
  POR_DEFECTO,
  _internos: { contarEvento, puedeAvisar, limpiarMemoria, RUTA },
}
