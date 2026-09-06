//CÓDIGO ORIGINAL DE YUIBOT-MD
const { createCanvas, loadImage } = require('canvas')
const { downloadContentFromMessage } = require('@whiskeysockets/baileys')

async function descargarImagenMensaje(mensaje) {
  const stream = await downloadContentFromMessage(mensaje, 'image')
  const partes = []
  for await (const chunk of stream) partes.push(chunk)
  return Buffer.concat(partes)
}

function textoAjustado(ctx, texto, x, y, maxWidth, lineHeight) {
  const palabras = String(texto).split(/\s+/)
  const lineas = []
  let linea = ''
  for (const palabra of palabras) {
    const prueba = linea ? `${linea} ${palabra}` : palabra
    if (ctx.measureText(prueba).width > maxWidth && linea) {
      lineas.push(linea)
      linea = palabra
    } else {
      linea = prueba
    }
  }
  if (linea) lineas.push(linea)
  lineas.forEach((lineaActual, i) => ctx.fillText(lineaActual, x, y + i * lineHeight))
  return lineas.length
}

function fondo(ctx, ancho, alto, variante = 0) {
  const gradiente = ctx.createLinearGradient(0, 0, ancho, alto)
  const fondos = [
    ['#140d24', '#32104f', '#07151c'],
    ['#061b2b', '#123f5c', '#160d2b'],
    ['#21130b', '#51220f', '#120d1b'],
    ['#10241d', '#174c3b', '#08151a'],
  ]
  const colores = fondos[variante % fondos.length]
  gradiente.addColorStop(0, colores[0])
  gradiente.addColorStop(0.5, colores[1])
  gradiente.addColorStop(1, colores[2])
  ctx.fillStyle = gradiente
  ctx.fillRect(0, 0, ancho, alto)
}

async function cargarAvatar(sock, jid) {
  const url = await sock.profilePictureUrl(jid, 'image')
  const respuesta = await fetch(url)
  if (!respuesta.ok) throw new Error(`HTTP ${respuesta.status}`)
  return Buffer.from(await respuesta.arrayBuffer())
}

function dibujarCirculo(ctx, imagen, x, y, radio) {
  ctx.save()
  ctx.beginPath()
  ctx.arc(x, y, radio, 0, Math.PI * 2)
  ctx.clip()
  const escala = Math.max((radio * 2) / imagen.width, (radio * 2) / imagen.height)
  const ancho = imagen.width * escala
  const alto = imagen.height * escala
  ctx.drawImage(imagen, x - ancho / 2, y - alto / 2, ancho, alto)
  ctx.restore()
  ctx.save()
  ctx.strokeStyle = '#ffffff'
  ctx.lineWidth = 8
  ctx.beginPath()
  ctx.arc(x, y, radio, 0, Math.PI * 2)
  ctx.stroke()
  ctx.restore()
}

function crearLienzo(ancho = 1024, alto = 1024, variante = 0) {
  const canvas = createCanvas(ancho, alto)
  const ctx = canvas.getContext('2d')
  fondo(ctx, ancho, alto, variante)
  return { canvas, ctx }
}

module.exports = { createCanvas, loadImage, descargarImagenMensaje, textoAjustado, cargarAvatar, dibujarCirculo, crearLienzo }
