//CÓDIGO ORIGINAL DE YUIBOT-MD
const { caja, negrita } = require('../../lib/estilo')
const fetch = require('../../lib/http').fetchSeguro // timeout por defecto (ver lib/http.js)
const delirius = require('../../lib/delirius')
const { reintentar } = require('../../lib/reintentar')
const { crearStickerWebp } = require('../../lib/stickers')

const LIMITE_STICKERS = 10

function extensionDe(url) {
  const match = url.match(/\.(\w+)(\?|$)/)
  return match ? match[1].toLowerCase() : 'png'
}

module.exports = {
  name: 'stickerly',
  aliases: ['spack', 'stickerpack'],
  description: 'Busca y envía un paquete de stickers',
  category: 'media',

  async execute(sock, msg, args, { config }) {
    const jid = msg.key.remoteJid
    const prefijo = config.PREFIXES[0]

    const partes = args.join(' ').trim().split(/\s+/)
    const ultimoEsNumero = /^\d+$/.test(partes[partes.length - 1])
    const numeroPack = ultimoEsNumero ? parseInt(partes.pop(), 10) : 1
    const query = partes.join(' ').trim()

    if (!query) {
      return sock.sendMessage(
        jid,
        {
          text:
            `❌ Escribe qué quieres buscar.\n\n` +
            `📌 Ejemplo: ${prefijo}stickerly gatitos\n` +
            `📌 Para elegir otro paquete de los resultados: ${prefijo}stickerly gatitos 3`
        },
        { quoted: msg }
      )
    }

    try {
      const paquetes = await delirius.buscarStickerly(query)

      if (numeroPack < 1 || numeroPack > paquetes.length) {
        let lista = `❌ Ese paquete no existe. Hay ${paquetes.length} disponibles para "${query}":\n\n`
        paquetes.forEach((p, i) => {
          lista += `${i + 1}. ${p.titulo} — por ${p.autor} (${p.cantidad} stickers)\n`
        })
        lista += `\n📌 Usa: ${prefijo}stickerly ${query} <número>`
        return sock.sendMessage(jid, { text: lista }, { quoted: msg })
      }

      const elegido = paquetes[numeroPack - 1]
      const paquete = await delirius.paqueteStickerly(elegido.url)
      const seleccion = paquete.stickers.slice(0, LIMITE_STICKERS)

      await sock.sendMessage(
        jid,
        {
          text: caja('📦', 'Sticker.ly', [
            ['Paquete', paquete.titulo || elegido.titulo],
            ['Autor', paquete.autor || elegido.autor],
            ['Enviando', `${seleccion.length} de ${paquete.stickers.length} stickers`],
            paquetes.length > 1 ? ['Otros paquetes', `${prefijo}stickerly ${query} 2`, '💡'] : null
          ], 'Un momento ✨')
        },
        { quoted: msg }
      )

      let enviados = 0
      let fallidos = 0

      for (const urlSticker of seleccion) {
        try {
          const respImg = await fetch(urlSticker)
          if (!respImg.ok) throw new Error(`HTTP ${respImg.status}`)

          const buffer = Buffer.from(await respImg.arrayBuffer())
          if (buffer.length < 200) throw new Error('Archivo demasiado pequeño')

          const ext = extensionDe(urlSticker)

          // Los .webp de Sticker.ly ya son stickers (conservan la animación): se envían tal cual.
          const webp = ext === 'webp'
            ? buffer
            : await crearStickerWebp(buffer, { animado: ext === 'gif', config, extensionEntrada: ext })
          await reintentar(() => sock.sendMessage(jid, { sticker: webp }, { quoted: msg }))
          enviados++
        } catch (errIndividual) {
          fallidos++
          console.error(`[STICKERLY] Falló ${urlSticker}:`, errIndividual.message)
        }
      }

      await sock.sendMessage(
        jid,
        { text: caja('✅', 'Stickers enviados', [['Enviados', enviados], fallidos > 0 ? ['Fallidos', fallidos, '⚠️'] : null], 'YuiBot-MD ✨') },
        { quoted: msg }
      )

    } catch (error) {
      console.error('[STICKERLY]', error)
      await sock.sendMessage(
        jid,
        { text: `❌ No se pudieron obtener los stickers de "${query}".\n\n> ${error.message || 'Error desconocido'}` },
        { quoted: msg }
      )
    }
  },
}