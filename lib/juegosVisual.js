//CÓDIGO ORIGINAL DE YUIBOT-MD
const { createCanvas } = require('canvas')

function fondo(ctx, ancho, alto) {
  const gradiente = ctx.createLinearGradient(0, 0, ancho, alto)
  gradiente.addColorStop(0, '#140d24')
  gradiente.addColorStop(0.5, '#26113f')
  gradiente.addColorStop(1, '#07151c')
  ctx.fillStyle = gradiente
  ctx.fillRect(0, 0, ancho, alto)

  const brillo = ctx.createRadialGradient(ancho * 0.78, alto * 0.2, 10, ancho * 0.78, alto * 0.2, 300)
  brillo.addColorStop(0, 'rgba(177,104,255,0.35)')
  brillo.addColorStop(1, 'rgba(177,104,255,0)')
  ctx.fillStyle = brillo
  ctx.fillRect(0, 0, ancho, alto)

  ctx.strokeStyle = 'rgba(205,151,255,0.8)'
  ctx.lineWidth = 5
  ctx.strokeRect(8, 8, ancho - 16, alto - 16)
}

function texto(ctx, value, x, y, size, align = 'left', color = '#ffffff', weight = 'bold') {
  ctx.save()
  ctx.textAlign = align
  ctx.fillStyle = color
  ctx.font = `${weight} ${size}px sans-serif`
  ctx.shadowColor = 'rgba(0,0,0,0.65)'
  ctx.shadowBlur = 10
  ctx.fillText(value, x, y)
  ctx.restore()
}

function crearImagenJuego({ icono, titulo, subtitulo, datos = [] }) {
  const ancho = 1024
  const alto = 500
  const canvas = createCanvas(ancho, alto)
  const ctx = canvas.getContext('2d')
  fondo(ctx, ancho, alto)

  texto(ctx, '✦ YUI GAMES ✦', 60, 70, 30, 'left', '#d9b3ff')
  texto(ctx, icono, 60, 180, 105, 'left')
  texto(ctx, titulo.toUpperCase(), 210, 145, 52, 'left', '#ffffff')
  texto(ctx, subtitulo, 210, 185, 24, 'left', '#e6d7f7', 'normal')

  let y = 275
  for (const dato of datos.slice(0, 4)) {
    texto(ctx, dato, 80, y, 30, 'left', '#ffffff', 'normal')
    y += 48
  }

  texto(ctx, '🍃 YuiBot-MD', ancho - 55, alto - 35, 22, 'right', '#cda6ee', 'normal')
  return canvas.toBuffer('image/jpeg', { quality: 0.92 })
}

async function enviarJuego(sock, msg, opciones) {
  const jid = msg.key.remoteJid
  const imagen = crearImagenJuego(opciones)
  const buttons = (opciones.botones || []).map((boton) => ({
    buttonId: boton.id,
    buttonText: { displayText: boton.text },
    type: 1,
  }))

  await sock.sendMessage(jid, {
    image: imagen,
    caption: opciones.caption || `✦ ${opciones.titulo} ✦`,
    footer: '🍃 YuiBot-MD • Yui Games',
    buttons,
    headerType: 4,
  }, { quoted: msg })
}

module.exports = { crearImagenJuego, enviarJuego }
