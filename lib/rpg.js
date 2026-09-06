//CÓDIGO ORIGINAL DE YUIBOT-MD
const { createCanvas } = require('canvas')
const { obtenerUsuario, guardarUsuario, calcularNivel, xpParaNivel } = require('./db')

function numeroUsuario(msg) {
  const jid = msg.key.participantAlt || msg.key.participant || msg.key.remoteJid
  return jid.split('@')[0].split(':')[0]
}

function nombreUsuario(sock, msg, numero) {
  return msg.pushName || numero || 'Aventurero'
}

function estado(numero) {
  const usuario = obtenerUsuario(numero) || {}
  const xp = usuario.xp || 0
  const nivel = Math.max(1, usuario.nivel || calcularNivel(xp))
  return { usuario, xp, nivel, monedas: usuario.monedas || 0 }
}

function progresoNivel(xp, nivel) {
  const actual = xpParaNivel(nivel)
  const siguiente = xpParaNivel(nivel + 1)
  return { actual, siguiente, progreso: Math.max(0, xp - actual), necesario: Math.max(1, siguiente - actual) }
}

function barra(valor, maximo, largo = 14) {
  const porcentaje = Math.max(0, Math.min(1, valor / Math.max(1, maximo)))
  const llenos = Math.round(porcentaje * largo)
  return '▰'.repeat(llenos) + '▱'.repeat(largo - llenos)
}

function crearImagen({ icono, titulo, subtitulo, datos = [] }) {
  const ancho = 1100
  const alto = 620
  const canvas = createCanvas(ancho, alto)
  const ctx = canvas.getContext('2d')
  const fondo = ctx.createLinearGradient(0, 0, ancho, alto)
  fondo.addColorStop(0, '#10091c')
  fondo.addColorStop(0.5, '#24103d')
  fondo.addColorStop(1, '#07181c')
  ctx.fillStyle = fondo
  ctx.fillRect(0, 0, ancho, alto)
  const brillo = ctx.createRadialGradient(850, 110, 10, 850, 110, 360)
  brillo.addColorStop(0, 'rgba(188,120,255,0.4)')
  brillo.addColorStop(1, 'rgba(188,120,255,0)')
  ctx.fillStyle = brillo
  ctx.fillRect(0, 0, ancho, alto)
  ctx.strokeStyle = 'rgba(220,180,255,0.85)'
  ctx.lineWidth = 5
  ctx.strokeRect(10, 10, ancho - 20, alto - 20)
  ctx.textAlign = 'left'
  ctx.fillStyle = '#d9b3ff'
  ctx.font = 'bold 30px sans-serif'
  ctx.fillText('✦ YUI RPG ✦', 55, 65)
  ctx.font = '110px sans-serif'
  ctx.fillText(icono || '⚔️', 60, 205)
  ctx.fillStyle = '#ffffff'
  ctx.font = 'bold 54px sans-serif'
  ctx.fillText(String(titulo || '').toUpperCase(), 215, 150)
  ctx.fillStyle = '#e8dcf5'
  ctx.font = '25px sans-serif'
  ctx.fillText(subtitulo || 'Aventura en YuiBot-MD', 215, 190)
  let y = 285
  for (const dato of datos.slice(0, 6)) {
    ctx.fillStyle = '#ffffff'
    ctx.font = 'bold 30px sans-serif'
    ctx.fillText(String(dato), 70, y)
    y += 48
  }
  ctx.fillStyle = '#cda6ee'
  ctx.font = '22px sans-serif'
  ctx.textAlign = 'right'
  ctx.fillText('🍃 YuiBot-MD', ancho - 55, alto - 35)
  return canvas.toBuffer('image/jpeg', { quality: 0.93 })
}

async function enviarRpg(sock, msg, opciones) {
  const jid = msg.key.remoteJid
  const botones = (opciones.botones || []).map((b) => ({ buttonId: b.id, buttonText: { displayText: b.text }, type: 1 }))
  await sock.sendMessage(jid, {
    image: crearImagen(opciones),
    caption: opciones.caption || `✦ ${opciones.titulo} ✦`,
    footer: '🍃 YuiBot-MD • YUI RPG',
    buttons: botones,
    headerType: 4,
  }, { quoted: msg })
}

function sumarMision(numero, tipo, cantidad = 1) {
  const usuario = obtenerUsuario(numero) || {}
  const misiones = usuario.rpgMisiones
  if (!misiones || !misiones.fecha || misiones.fecha !== new Date().toISOString().slice(0, 10)) return
  const mision = misiones.lista?.find((x) => x.tipo === tipo && !x.reclamada)
  if (mision) mision.progreso = Math.min(mision.meta, (mision.progreso || 0) + cantidad)
  guardarUsuario(numero, { rpgMisiones: misiones })
}

module.exports = { numeroUsuario, nombreUsuario, estado, progresoNivel, barra, crearImagen, enviarRpg, sumarMision }
