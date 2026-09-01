//CÓDIGO ORIGINAL DE YUIBOT-MD
const { createCanvas, loadImage } = require('canvas')

async function cargarImagenDesdeUrl(url) {
  const resp = await fetch(url)
  if (!resp.ok) throw new Error(`No se pudo descargar imagen: HTTP ${resp.status}`)
  const buffer = Buffer.from(await resp.arrayBuffer())
  return loadImage(buffer)
}

function dibujarCirculo(ctx, imagen, x, y, radio) {
  ctx.save()
  ctx.shadowColor = 'rgba(0,0,0,0.6)'
  ctx.shadowBlur = 20
  ctx.beginPath()
  ctx.arc(x, y, radio + 4, 0, Math.PI * 2, true)
  ctx.fillStyle = '#8b1e1e'
  ctx.fill()
  ctx.restore()

  ctx.save()
  ctx.beginPath()
  ctx.arc(x, y, radio, 0, Math.PI * 2, true)
  ctx.closePath()
  ctx.clip()
  ctx.drawImage(imagen, x - radio, y - radio, radio * 2, radio * 2)
  ctx.restore()

  ctx.beginPath()
  ctx.arc(x, y, radio, 0, Math.PI * 2, true)
  ctx.lineWidth = 5
  ctx.strokeStyle = '#ffffff'
  ctx.stroke()
}

function textoConSombra(ctx, texto, x, y) {
  ctx.save()
  ctx.shadowColor = 'rgba(0,0,0,0.85)'
  ctx.shadowBlur = 12
  ctx.shadowOffsetX = 2
  ctx.shadowOffsetY = 2
  ctx.fillText(texto, x, y)
  ctx.restore()
}

async function generarImagenBienvenida({ username, guildName, memberCount, avatar, background, botName }) {
  const ancho = 1024
  const alto = 450
  const canvas = createCanvas(ancho, alto)
  const ctx = canvas.getContext('2d')

  try {
    const imgFondo = await cargarImagenDesdeUrl(background)
    ctx.drawImage(imgFondo, 0, 0, ancho, alto)
  } catch (error) {
    console.error('[WELCOME] No se pudo cargar el fondo, se usa uno sólido:', error.message)
    ctx.fillStyle = '#0d0d0d'
    ctx.fillRect(0, 0, ancho, alto)
  }

  const gradienteInferior = ctx.createLinearGradient(0, alto * 0.45, 0, alto)
  gradienteInferior.addColorStop(0, 'rgba(0,0,0,0)')
  gradienteInferior.addColorStop(1, 'rgba(0,0,0,0.88)')
  ctx.fillStyle = gradienteInferior
  ctx.fillRect(0, 0, ancho, alto)

  const gradienteIzquierda = ctx.createLinearGradient(0, 0, ancho * 0.42, 0)
  gradienteIzquierda.addColorStop(0, 'rgba(0,0,0,0.75)')
  gradienteIzquierda.addColorStop(1, 'rgba(0,0,0,0)')
  ctx.fillStyle = gradienteIzquierda
  ctx.fillRect(0, 0, ancho, alto)

  ctx.strokeStyle = '#8b1e1e'
  ctx.lineWidth = 6
  ctx.strokeRect(3, 3, ancho - 6, alto - 6)
  ctx.strokeStyle = 'rgba(255,255,255,0.5)'
  ctx.lineWidth = 1
  ctx.strokeRect(12, 12, ancho - 24, alto - 24)

  try {
    const imgAvatar = await cargarImagenDesdeUrl(avatar)
    dibujarCirculo(ctx, imgAvatar, 150, 150, 100)
  } catch (error) {
    console.error('[WELCOME] No se pudo cargar el avatar:', error.message)
  }

  ctx.textAlign = 'left'
  ctx.fillStyle = '#ffffff'
  ctx.font = 'bold 52px sans-serif'
  textoConSombra(ctx, username.toUpperCase(), 40, 320)

  ctx.strokeStyle = '#8b1e1e'
  ctx.lineWidth = 3
  ctx.beginPath()
  ctx.moveTo(40, 335)
  ctx.lineTo(280, 335)
  ctx.stroke()

  ctx.font = '24px sans-serif'
  ctx.fillStyle = '#e0b0b0'
  textoConSombra(ctx, `🥀 ¡Miembro número ${memberCount}!`, 40, 375)

  ctx.textAlign = 'right'
  ctx.font = 'bold 26px sans-serif'
  ctx.fillStyle = '#e0b0b0'
  textoConSombra(ctx, '⛧ BIENVENIDO A ⛧', ancho - 40, 95)

  ctx.font = 'bold 50px sans-serif'
  ctx.fillStyle = '#ffffff'
  textoConSombra(ctx, guildName.toUpperCase(), ancho - 40, 150)

  if (botName) {
    ctx.textAlign = 'right'
    ctx.font = 'italic 20px sans-serif'
    ctx.fillStyle = 'rgba(255,255,255,0.65)'
    textoConSombra(ctx, botName, ancho - 30, alto - 25)
  }

  return canvas.toBuffer('image/jpeg', { quality: 0.92 })
}

module.exports = { generarImagenBienvenida }