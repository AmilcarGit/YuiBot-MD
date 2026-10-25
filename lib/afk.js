// Modo AFK: avisa a quien te mencione o cite que estás ausente.
const path = require('path')
const { crearAlmacenCacheado } = require('./escrituraAtomica')
const { describirDuracion } = require('./fechas')

const RUTA = path.join(__dirname, '..', 'data', 'afk.json')
const almacen = crearAlmacenCacheado(RUTA)
const AVISO_CADA_MS = 60000
const ultimoAviso = new Map()

function activar(numero, motivo) {
  const d = almacen.leer()
  d[numero] = { motivo: String(motivo || '').slice(0, 200), desde: Date.now() }
  almacen.guardar(d)
}

function obtener(numero) {
  const d = almacen.leer()
  return d[numero] ? { ...d[numero] } : null
}

function desactivar(numero) {
  const d = almacen.leer()
  const previo = d[numero]
  if (!previo) return null
  delete d[numero]
  almacen.guardar(d)
  return { ...previo }
}

function numeroDe(jid) {
  return String(jid || '').split('@')[0].split(':')[0]
}

// Hook: si el autor estaba AFK, lo quita; si mencionan/citan a un AFK, avisa.
async function aplicar(sock, msg, ctx) {
  const jid = msg.key.remoteJid
  if (!ctx.esGrupo || msg.key.fromMe) return false
  const autor = ctx.numeroRemitente
  const palabras = String(ctx.body || '').trim().split(/\s+/)
  const esComandoAfk = /^[!./#]?afk$/i.test(palabras[0] || '')

  if (!esComandoAfk) {
    const previo = desactivar(autor)
    if (previo) {
      await sock.sendMessage(jid, {
        text: `👋 Bienvenido de vuelta @${autor}, estuviste AFK ${describirDuracion(Date.now() - previo.desde)}.`,
        mentions: [`${autor}@s.whatsapp.net`],
      }, { quoted: msg }).catch(() => {})
    }
  }

  const info = msg.message?.extendedTextMessage?.contextInfo || {}
  const objetivos = new Set([...(info.mentionedJid || []), info.participant].filter(Boolean).map(numeroDe))
  const ahora = Date.now()
  for (const n of objetivos) {
    if (n === autor) continue
    const a = obtener(n)
    if (!a) continue
    const clave = `${jid}:${n}`
    if (ahora - (ultimoAviso.get(clave) || 0) < AVISO_CADA_MS) continue
    ultimoAviso.set(clave, ahora)
    await sock.sendMessage(jid, {
      text: `💤 @${n} está AFK hace ${describirDuracion(ahora - a.desde)}${a.motivo ? `\n📝 ${a.motivo}` : ''}`,
      mentions: [`${n}@s.whatsapp.net`],
    }, { quoted: msg }).catch(() => {})
  }
  return false
}

module.exports = { activar, obtener, desactivar, aplicar, RUTA }
