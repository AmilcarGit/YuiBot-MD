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
  ctx.beginPath()
  ctx.arc(x, y, radio, 0, Math.PI * 2, true)
  ctx.closePath()
  ctx.clip()
  ctx.drawImage(imagen, x - radio, y - radio, radio * 2, radio * 2)
  ctx.restore()

  ctx.beginPath()
  ctx.arc(x, y, radio, 0, Math.PI * 2, true)
  ctx.lineWidth = 6
  ctx.strokeStyle = '#ffffff'
  ctx.stroke()
}

async function generarImagenBienvenida({ username, guildName, memberCount, avatar, background }) {
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

  ctx.fillStyle = 'rgba(0,0,0,0.45)'
  ctx.fillRect(0, 0, ancho, alto)

  try {
    const imgAvatar = await cargarImagenDesdeUrl(avatar)
    dibujarCirculo(ctx, imgAvatar, 150, 150, 100)
  } catch (error) {
    console.error('[WELCOME] No se pudo cargar el avatar:', error.message)
  }

  ctx.textAlign = 'left'
  ctx.fillStyle = '#ffffff'
  ctx.font = 'bold 46px sans-serif'
  ctx.fillText(username.toUpperCase(), 40, 320)

  ctx.font = '24px sans-serif'
  ctx.fillStyle = '#cccccc'
  ctx.fillText(`¡Miembro número ${memberCount}!`, 40, 360)

  ctx.textAlign = 'right'
  ctx.font = 'bold 30px sans-serif'
  ctx.fillStyle = '#ffffff'
  ctx.fillText('BIENVENIDO A', ancho - 40, 100)

  ctx.font = 'bold 46px sans-serif'
  ctx.fillText(guildName.toUpperCase(), ancho - 40, 150)

  return canvas.toBuffer('image/jpeg', { quality: 0.9 })
}

module.exports = { generarImagenBienvenida }