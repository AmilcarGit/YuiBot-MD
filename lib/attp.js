//CÓDIGO ORIGINAL DE YUIBOT-MD
const { createCanvas } = require('canvas')

function hslATexto(hue) {
  return `hsl(${hue}, 90%, 55%)`
}

function generarFramesTexto(texto, { totalFrames = 20, tamano = 512 } = {}) {
  const caracteres = texto.split('')
  const frames = []

  for (let f = 0; f < totalFrames; f++) {
    const canvas = createCanvas(tamano, tamano)
    const ctx = canvas.getContext('2d')

    ctx.fillStyle = '#000000'
    ctx.fillRect(0, 0, tamano, tamano)

    const tamanoFuente = Math.max(30, Math.floor((tamano - 60) / Math.max(1, caracteres.length * 0.72)))
    ctx.font = `bold ${tamanoFuente}px sans-serif`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'

    const anchoTotal = caracteres.reduce((acc, c) => acc + ctx.measureText(c).width + 4, 0)
    let x = tamano / 2 - anchoTotal / 2

    caracteres.forEach((char, i) => {
      const hue = (i * 35 + f * 25) % 360
      const salto = Math.sin((f / totalFrames) * Math.PI * 2 + i) * 18

      ctx.fillStyle = hslATexto(hue)
      const anchoChar = ctx.measureText(char).width + 4
      ctx.fillText(char, x + anchoChar / 2, tamano / 2 + salto)
      x += anchoChar
    })

    frames.push(canvas.toBuffer('image/png'))
  }

  return frames
}

module.exports = { generarFramesTexto }