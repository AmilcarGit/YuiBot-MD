//CÓDIGO ORIGINAL DE YUIBOT-MD
const { createCanvas } = require('canvas')
const { crearStickerWebp } = require('../../lib/stickers')

const TAMANO = 512
const COLOR_FONDO = '#8ace00'

function ajustarTamanoFuente(ctx, texto, anchoMax) {
  let tamano = 130
  do {
    ctx.font = `bold ${tamano}px sans-serif`
    const ancho = ctx.measureText(texto).width
    if (ancho <= anchoMax) break
    tamano -= 4
  } while (tamano > 20)
  return tamano
}

module.exports = {
  name: 'brat',
  aliases: ['bratcover'],
  description: 'Genera un sticker estilo portada Brat con tu texto',
  category: 'media',

  async execute(sock, msg, args, { config }) {
    const jid = msg.key.remoteJid
    const prefijo = config.PREFIXES[0]
    const texto = args.join(' ').trim().toLowerCase()

    if (!texto) {
      return sock.sendMessage(
        jid,
        { text: `❌ Escribe el texto para el sticker.\n📌 Ejemplo: ${prefijo}brat mi vida es un caos` },
        { quoted: msg }
      )
    }

    if (texto.length > 40) {
      return sock.sendMessage(jid, { text: '❌ El texto es muy largo, usa máximo 40 caracteres.' }, { quoted: msg })
    }

    try {
      const canvas = createCanvas(TAMANO, TAMANO)
      const ctx = canvas.getContext('2d')

      ctx.fillStyle = COLOR_FONDO
      ctx.fillRect(0, 0, TAMANO, TAMANO)

      const padding = 50
      const anchoMax = TAMANO - padding * 2

      // Parte el texto en varias líneas si no cabe en una sola
      const palabras = texto.split(' ')
      let lineas = []
      let lineaActual = ''
      const tamanoBase = ajustarTamanoFuente(ctx, texto, anchoMax * 2.2)

      ctx.font = `bold ${tamanoBase}px sans-serif`
      for (const palabra of palabras) {
        const prueba = lineaActual ? `${lineaActual} ${palabra}` : palabra
        if (ctx.measureText(prueba).width > anchoMax && lineaActual) {
          lineas.push(lineaActual)
          lineaActual = palabra
        } else {
          lineaActual = prueba
        }
      }
      if (lineaActual) lineas.push(lineaActual)

      const alturaLinea = tamanoBase * 1.05
      const alturaTotal = alturaLinea * lineas.length
      let y = TAMANO / 2 - alturaTotal / 2 + alturaLinea / 2

      ctx.fillStyle = '#000000'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.shadowColor = 'rgba(0,0,0,0.35)'
      ctx.shadowBlur = 6

      for (const linea of lineas) {
        ctx.fillText(linea, TAMANO / 2, y)
        y += alturaLinea
      }

      const buffer = canvas.toBuffer('image/png')
      const webp = await crearStickerWebp(buffer, { animado: false, config, extensionEntrada: 'png' })

      await sock.sendMessage(jid, { sticker: webp }, { quoted: msg })
    } catch (error) {
      console.error('[BRAT]', error)
      await sock.sendMessage(
        jid,
        { text: `❌ No se pudo generar el sticker.\n\n> ${error.message || 'Error desconocido'}` },
        { quoted: msg }
      )
    }
  },
}