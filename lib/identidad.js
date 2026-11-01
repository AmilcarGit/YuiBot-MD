// Identidad de quien escribe: WhatsApp a veces entrega un LID (número largo que NO es el teléfono)
// en vez del teléfono. Aquí se normaliza la clave del mensaje para que TODO el bot (monedas, nivel, trabajos…)
// use siempre el teléfono real, y se aprende la relación LID → teléfono para los casos en que falte.
const path = require('path')
const { crearAlmacenCacheado } = require('./escrituraAtomica')

const RUTA = path.join(__dirname, '..', 'data', 'lid-mapa.json')
const almacen = crearAlmacenCacheado(RUTA, () => ({}))

const esLid = (jid) => /@lid$/.test(String(jid || ''))
const esPn = (jid) => /@s\.whatsapp\.net$/.test(String(jid || ''))
const digitos = (jid) => String(jid || '').split('@')[0].split(':')[0].replace(/\D/g, '')

function mapa() { try { return almacen.leer() || {} } catch { return {} } }

/** Guarda lid → teléfono (solo dígitos). Devuelve true si aprendió algo nuevo. */
function aprender(lid, pn) {
  const l = digitos(lid); const p = digitos(pn)
  if (!l || !p || l === p || !/^\d{6,16}$/.test(p)) return false
  const m = mapa()
  if (m[l] === p) return false
  m[l] = p
  try { almacen.guardar(m) } catch { return false }
  return true
}

/** Teléfono de un jid cualquiera (@lid se traduce si ya se conoce). Si no se conoce, devuelve los dígitos tal cual. */
function numeroDe(jid) {
  const d = digitos(jid)
  if (!d) return ''
  return esLid(jid) ? (mapa()[d] || d) : d
}

/**
 * Deja msg.key con el teléfono real en participantAlt (lo que ya leen todos los módulos).
 * Cubre: grupos con LID sin alterno, y chats privados donde remoteJid es un LID (remoteJidAlt trae el teléfono).
 * Devuelve true si aprendió una relación nueva.
 */
function normalizarMensaje(msg) {
  const k = msg?.key
  if (!k || k.fromMe) return false
  let nuevo = false
  const alt = k.participantAlt && esPn(k.participantAlt) ? k.participantAlt : null
  if (k.participant && esLid(k.participant) && alt) nuevo = aprender(k.participant, alt) || nuevo
  if (esLid(k.remoteJid) && k.remoteJidAlt && esPn(k.remoteJidAlt)) nuevo = aprender(k.remoteJid, k.remoteJidAlt) || nuevo

  if (!alt) {
    let pn = null
    if (k.participant && esLid(k.participant)) { const p = mapa()[digitos(k.participant)]; if (p) pn = `${p}@s.whatsapp.net` }
    else if (!k.participant && esLid(k.remoteJid)) {
      if (k.remoteJidAlt && esPn(k.remoteJidAlt)) pn = k.remoteJidAlt
      else { const p = mapa()[digitos(k.remoteJid)]; if (p) pn = `${p}@s.whatsapp.net` }
    }
    if (pn) k.participantAlt = pn
  }
  if (nuevo) { try { unirLid(digitos(k.participant || k.remoteJid)) } catch { /* nunca debe romper un mensaje */ } }
  return nuevo
}

const SUMAR = ['monedas', 'xp', 'mensajes', 'reputacion', 'trabajosVeces', 'trabajosGanado', 'xpSemana']
const MAXIMO = ['mejorRacha', 'racha', 'ultimoDaily', 'ultimoXp', 'mejorasTotal', 'actualizado']

function fusionarUsuario(destino, origen) {
  const r = { ...origen, ...destino } // el registro del teléfono manda; el del LID solo rellena huecos
  for (const f of SUMAR) if (destino?.[f] !== undefined || origen?.[f] !== undefined) r[f] = (Number(destino?.[f]) || 0) + (Number(origen?.[f]) || 0)
  for (const f of MAXIMO) if (destino?.[f] !== undefined || origen?.[f] !== undefined) r[f] = Math.max(Number(destino?.[f]) || 0, Number(origen?.[f]) || 0)
  const inv = [...(Array.isArray(destino?.inventario) ? destino.inventario : []), ...(Array.isArray(origen?.inventario) ? origen.inventario : [])]
  if (inv.length) r.inventario = [...new Set(inv)]
  return r
}

function fusionarTrabajo(destino, origen) {
  const r = { ...origen, ...destino }
  r.ganado = (Number(destino?.ganado) || 0) + (Number(origen?.ganado) || 0)
  r.veces = { ...(origen?.veces || {}) }
  for (const [k, v] of Object.entries(destino?.veces || {})) r.veces[k] = (Number(r.veces[k]) || 0) + (Number(v) || 0)
  if (destino?.mejoras || origen?.mejoras) {
    r.mejoras = { ...(origen?.mejoras || {}) }
    for (const [k, v] of Object.entries(destino?.mejoras || {})) r.mejoras[k] = Math.max(Number(r.mejoras[k]) || 0, Number(v) || 0)
  }
  r.actualizado = Math.max(Number(destino?.actualizado) || 0, Number(origen?.actualizado) || 0)
  return r
}

/** Pasa lo guardado bajo un LID al teléfono correspondiente. Devuelve cuántos registros movió. */
function unirLid(lid) {
  const m = mapa(); const l = digitos(lid); const p = m[l]
  if (!l || !p || l === p) return 0
  const db = require('./db'); const trabajos = require('./trabajos')
  let movidos = 0
  db.transaccionUsuarios((u) => { if (u[l]) { u[p] = fusionarUsuario(u[p], u[l]); u[p].actualizado = Date.now(); delete u[l]; movidos++ } })
  trabajos.transaccion((t) => { if (t[l]) { t[p] = fusionarTrabajo(t[p], t[l]); delete t[l]; movidos++ } })
  return movidos
}

/** Revisa todo lo guardado y une cualquier LID que ya se sepa traducir. */
function unirTodos() {
  let n = 0
  for (const l of Object.keys(mapa())) { try { n += unirLid(l) } catch { /* sigue con el resto */ } }
  return n
}

module.exports = { esLid, esPn, aprender, numeroDe, normalizarMensaje, unirLid, unirTodos, fusionarUsuario, fusionarTrabajo }
