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
function rectRedondeado(ctx, x, y, w, h, r) {
  const radio = Math.max(0, Math.min(r, h / 2, Math.max(w, 1) / 2))
  ctx.beginPath()
  ctx.moveTo(x + radio, y)
  ctx.lineTo(x + w - radio, y)
  ctx.quadraticCurveTo(x + w, y, x + w, y + radio)
  ctx.lineTo(x + w, y + h - radio)
  ctx.quadraticCurveTo(x + w, y + h, x + w - radio, y + h)
  ctx.lineTo(x + radio, y + h)
  ctx.quadraticCurveTo(x, y + h, x, y + h - radio)
  ctx.lineTo(x, y + radio)
  ctx.quadraticCurveTo(x, y, x + radio, y)
  ctx.closePath()
}

async function generarImagenPerfil({ username, numero, nivel, xp, xpActualNivel, xpSiguienteNivel, mensajes, avatar, background, botName, titulo, colorBarra }) {
  const ancho = 1024
  const alto = 450
  const canvas = createCanvas(ancho, alto)
  const ctx = canvas.getContext('2d')

  try {
    const imgFondo = await cargarImagenDesdeUrl(background)
    ctx.drawImage(imgFondo, 0, 0, ancho, alto)
  } catch (error) {
    console.error('[PERFIL] No se pudo cargar el fondo, se usa uno sólido:', error.message)
    ctx.fillStyle = '#0d0d0d'
    ctx.fillRect(0, 0, ancho, alto)
  }

  const gradienteInferior = ctx.createLinearGradient(0, alto * 0.4, 0, alto)
  gradienteInferior.addColorStop(0, 'rgba(0,0,0,0)')
  gradienteInferior.addColorStop(1, 'rgba(0,0,0,0.88)')
  ctx.fillStyle = gradienteInferior
  ctx.fillRect(0, 0, ancho, alto)

  const gradienteIzquierda = ctx.createLinearGradient(0, 0, ancho * 0.42, 0)
  gradienteIzquierda.addColorStop(0, 'rgba(0,0,0,0.75)')
  gradienteIzquierda.addColorStop(1, 'rgba(0,0,0,0)')
  ctx.fillStyle = gradienteIzquierda
  ctx.fillRect(0, 0, ancho, alto)

  ctx.strokeStyle = '#6a2c8f'
  ctx.lineWidth = 6
  ctx.strokeRect(3, 3, ancho - 6, alto - 6)
  ctx.strokeStyle = 'rgba(255,255,255,0.5)'
  ctx.lineWidth = 1
  ctx.strokeRect(12, 12, ancho - 24, alto - 24)

  try {
    const imgAvatar = await cargarImagenDesdeUrl(avatar)
    dibujarCirculo(ctx, imgAvatar, 150, 150, 100)
  } catch (error) {
    console.error('[PERFIL] No se pudo cargar el avatar:', error.message)
  }

  ctx.textAlign = 'left'
  ctx.fillStyle = '#ffffff'
  ctx.font = 'bold 46px sans-serif'
  textoConSombra(ctx, username.toUpperCase(), 40, 300)

  ctx.font = '22px sans-serif'
  ctx.fillStyle = '#d9b3ff'
  textoConSombra(ctx, `+${numero}`, 40, 330)

  if (titulo) {
    ctx.font = 'italic 20px sans-serif'
    ctx.fillStyle = '#ffd9f7'
    textoConSombra(ctx, `"${titulo}"`, 40, 355)
  }

  const barraX = 40
  const barraY = titulo ? 378 : 360
  const barraAncho = 500
  const barraAlto = 24
  const rango = xpSiguienteNivel - xpActualNivel
  const progreso = rango > 0 ? Math.min(1, Math.max(0, (xp - xpActualNivel) / rango)) : 1

  ctx.fillStyle = 'rgba(255,255,255,0.15)'
  rectRedondeado(ctx, barraX, barraY, barraAncho, barraAlto, 12)
  ctx.fill()

  const anchoRelleno = barraAncho * progreso
  if (anchoRelleno > 1) {
    ctx.fillStyle = colorBarra || '#a349ff'
    rectRedondeado(ctx, barraX, barraY, anchoRelleno, barraAlto, 12)
    ctx.fill()
  }

  ctx.font = 'bold 18px sans-serif'
  ctx.fillStyle = '#ffffff'
  ctx.textAlign = 'left'
  textoConSombra(ctx, `${xp} / ${xpSiguienteNivel} XP`, barraX, barraY + barraAlto + 24)

  ctx.textAlign = 'right'
  ctx.font = 'bold 60px sans-serif'
  ctx.fillStyle = '#ffffff'
  textoConSombra(ctx, `NIVEL ${nivel}`, ancho - 40, 110)

  ctx.font = '22px sans-serif'
  ctx.fillStyle = '#d9b3ff'
  textoConSombra(ctx, `${mensajes} mensajes enviados`, ancho - 40, 145)

  if (botName) {
    ctx.textAlign = 'right'
    ctx.font = 'italic 20px sans-serif'
    ctx.fillStyle = 'rgba(255,255,255,0.65)'
    textoConSombra(ctx, botName, ancho - 30, alto - 25)
  }

  return canvas.toBuffer('image/jpeg', { quality: 0.92 })
}

module.exports.generarImagenPerfil = generarImagenPerfil