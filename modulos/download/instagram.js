//CÓDIGO ORIGINAL DE YUIBOT-MD
const fetch = require('../../lib/http').fetchSeguro // timeout por defecto (ver lib/http.js)
const { descargarInstagram } = require('../../lib/instagram')
const { caja, uso } = require('../../lib/estilo')
const { iniciar, fallar, conEstado } = require('../../lib/reaccion')
const { conFuentes, descargarLocal } = require('../../lib/youtube')

const LIMITE_VIDEO_MB = 64

module.exports = conEstado({
  name: 'instagram',
  aliases: ['ig', 'igdl'],
  description: 'Descarga un video o reel de Instagram',
  category: 'download',

  async execute(sock, msg, args, { config }) {
    const jid = msg.key.remoteJid
    const prefijo = config.PREFIXES[0]
    const link = args.join(' ').trim()

    if (!link) {
      return sock.sendMessage(
        jid,
        { text: uso(prefijo, 'instagram', 'https://www.instagram.com/reel/DCt2o8lMrsr/', 'Debes enviar un enlace de Instagram.') },
        { quoted: msg }
      )
    }

    if (!link.includes('instagram.com/')) {
      return sock.sendMessage(jid, { text: '❌ El enlace no parece ser de Instagram.' }, { quoted: msg })
    }

    try {
      await iniciar(sock, msg)

      // yt-dlp local primero (gratis); la API de antes queda como respaldo (también para fotos)
      const { buffer, selected, title, username } = await conFuentes({
        local: async () => {
          const r = await descargarLocal(link, 'video')
          return {
            buffer: r.buffer,
            selected: { type: 'video', filename: 'instagram.mp4' },
            title: r.info.description || r.titulo,
            username: r.info.uploader_id || r.info.uploader || r.canal,
          }
        },
        api: async () => {
          const datos = await descargarInstagram(link)
          const respArchivo = await fetch(datos.selected.download_url)
          if (!respArchivo.ok) throw new Error(`No se pudo descargar el archivo (HTTP ${respArchivo.status})`)
          return { ...datos, buffer: Buffer.from(await respArchivo.arrayBuffer()) }
        },
      })
      const pesoMB = buffer.length / (1024 * 1024)

      const caption = caja('📸', 'Instagram', [
        ['Descripción', String(title || 'Sin título').replace(/\s+/g, ' ').slice(0, 150), '📝'],
        ['Usuario', `@${username || 'desconocido'}`, '👤'],
        ['Tamaño', `${pesoMB.toFixed(1)} MB`, '💾'],
      ], '📥 Descargado de INSTAGRAM')

      if (selected.type === 'video') {
        if (pesoMB <= LIMITE_VIDEO_MB) {
          await sock.sendMessage(
            jid,
            { video: buffer, mimetype: 'video/mp4', fileName: selected.filename || 'instagram.mp4', caption },
            { quoted: msg }
          )
        } else {
          await sock.sendMessage(
            jid,
            { document: buffer, mimetype: 'video/mp4', fileName: selected.filename || 'instagram.mp4', caption },
            { quoted: msg }
          )
        }
      } else {
        await sock.sendMessage(jid, { image: buffer, caption }, { quoted: msg })
      }

    } catch (error) {
      await fallar(sock, msg)
      console.error('[INSTAGRAM]', error)
      await sock.sendMessage(
        jid,
        { text: `❌ No se pudo descargar de Instagram.\n\n> ${error.message || 'Error desconocido'}` },
        { quoted: msg }
      )
    }
  },
})
