//CÓDIGO ORIGINAL DE YUIBOT-MD
const REGEX_LINK = /chat\.whatsapp\.com\/[A-Za-z0-9]+/i

const registroFlood = new Map()

function contieneLink(texto) {
  return REGEX_LINK.test(texto || '')
}

function detectarFlood(numero, opciones = {}) {
  const { MAX_MENSAJES = 5, VENTANA_MS = 7000 } = opciones || {}
  const ahora = Date.now()
  const historial = (registroFlood.get(numero) || []).filter((t) => ahora - t < VENTANA_MS)
  historial.push(ahora)
  registroFlood.set(numero, historial)
  return historial.length > MAX_MENSAJES
}

function esAdminDeGrupo(metadata, numero) {
  const participante = metadata.participants.find((p) => p.id.split('@')[0].split(':')[0] === numero)
  return participante?.admin === 'admin' || participante?.admin === 'superadmin'
}

module.exports = { contieneLink, detectarFlood, esAdminDeGrupo }