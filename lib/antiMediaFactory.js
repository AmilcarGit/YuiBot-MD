//CÓDIGO ORIGINAL DE YUIBOT-MD
// Factory para los 5 filtros de tipo de contenido (antiaudio, antidocumento,
// antiimagen, antisticker, antivideo): mismo comportamiento, distinto tipo
// de mensaje que vigilan. Inspirado en el patrón de
// commands/grupos/_antiMedia.js de fsociety-bot (ellos también usan una
// sola factory para los 5, en vez de repetir el código 5 veces).

const { esAdminDeGrupo } = require('./moderacion')
const { estaEnWhitelist } = require('./whitelist')
const { isOwner } = require('./handler')
const antiMedia = require('./antiMedia')

const CONFIG_TIPOS = {
  image: { name: 'antiimagen', aliases: ['antiimage'], label: 'AntiImagen', item: 'imágenes', messageKey: 'imageMessage', icono: '🖼️' },
  sticker: { name: 'antisticker', aliases: ['antistiker', 'antistickers'], label: 'AntiSticker', item: 'stickers', messageKey: 'stickerMessage', icono: '🏷️' },
  video: { name: 'antivideo', aliases: ['antivideos'], label: 'AntiVideo', item: 'videos', messageKey: 'videoMessage', icono: '🎬' },
  audio: { name: 'antiaudio', aliases: ['antiaudios'], label: 'AntiAudio', item: 'audios', messageKey: 'audioMessage', icono: '🎧' },
  document: { name: 'antidocumento', aliases: ['antiarchivo', 'antidoc'], label: 'AntiDocumento', item: 'documentos', messageKey: 'documentMessage', icono: '📄' },
}

function tieneTipoDeMedia(msg, cfg) {
  if (msg.message?.[cfg.messageKey]) return true

  // Algunos clientes mandan imágenes/videos "disfrazados" de documento con
  // el mimetype correspondiente; se detectan igual para que no se cuelen.
  const mimeDocumento = String(msg.message?.documentMessage?.mimetype || '').toLowerCase()
  if (cfg.name === 'antiimagen' && mimeDocumento.startsWith('image/')) return true
  if (cfg.name === 'antivideo' && mimeDocumento.startsWith('video/')) return true
  if (cfg.name === 'antidocumento' && mimeDocumento && !mimeDocumento.startsWith('image/') && !mimeDocumento.startsWith('video/')) return true

  return false
}

function crearComandoAntiMedia(tipo) {
  const cfg = CONFIG_TIPOS[tipo]
  if (!cfg) throw new Error(`Tipo anti-media inválido: ${tipo}`)

  return {
    name: cfg.name,
    aliases: cfg.aliases,
    description: `Borra ${cfg.item} enviados por miembros normales del grupo`,
    category: 'grupo',

    async execute(sock, msg, args, { config }) {
      const jid = msg.key.remoteJid
      if (!jid.endsWith('@g.us')) {
        return sock.sendMessage(jid, { text: '❌ Este comando solo funciona en grupos.' }, { quoted: msg })
      }

      let metadata
      try {
        metadata = await sock.groupMetadata(jid)
      } catch (error) {
        return sock.sendMessage(jid, { text: '❌ No se pudo obtener la información del grupo.' }, { quoted: msg })
      }

      const remitente = msg.key.participantAlt || msg.key.participant || jid
      const numeroRemitente = remitente.split('@')[0].split(':')[0]
      const esAdmin = esAdminDeGrupo(metadata, numeroRemitente)
      const esOwnerBot = config.OWNERS.some((o) => o.numero === numeroRemitente)
      if (!esAdmin && !esOwnerBot) {
        return sock.sendMessage(jid, { text: '⛔ Solo los administradores del grupo pueden usar este comando.' }, { quoted: msg })
      }

      const accionArg = (args[0] || '').toLowerCase()
      if (['on', 'activar'].includes(accionArg)) {
        antiMedia.establecerEstado(jid, tipo, true)
        return sock.sendMessage(jid, { text: `${cfg.icono} *${cfg.label}* activado. Los ${cfg.item} de miembros normales serán eliminados.` }, { quoted: msg })
      }
      if (['off', 'desactivar'].includes(accionArg)) {
        antiMedia.establecerEstado(jid, tipo, false)
        return sock.sendMessage(jid, { text: `${cfg.icono} *${cfg.label}* desactivado.` }, { quoted: msg })
      }

      const activo = antiMedia.estaActivo(jid, tipo)
      return sock.sendMessage(jid, {
        text: `${cfg.icono} *${cfg.label.toUpperCase()}*\n\nEstado: *${activo ? 'ON ✅' : 'OFF ❌'}*\n\n${cfg.name} on\n${cfg.name} off`,
      }, { quoted: msg })
    },

    async onMessage(sock, msg, ctx) {
      const { jid, esGrupo, remitente, numeroRemitente, config } = ctx
      if (!esGrupo || msg.key.fromMe) return
      if (!antiMedia.estaActivo(jid, tipo)) return
      if (!tieneTipoDeMedia(msg, cfg)) return

      try {
        if (isOwner(remitente, config) || estaEnWhitelist(jid, numeroRemitente)) return

        const metadata = await sock.groupMetadata(jid)
        if (esAdminDeGrupo(metadata, numeroRemitente)) return

        await sock.sendMessage(jid, { delete: msg.key })

        const aviso = antiMedia.registrarAviso(jid, numeroRemitente)
        let expulsado = false

        if (aviso.shouldKick) {
          try {
            await sock.groupParticipantsUpdate(jid, [remitente], 'remove')
            antiMedia.limpiarAvisos(jid, numeroRemitente)
            expulsado = true
          } catch (error) {
            console.error(`[${cfg.name.toUpperCase()}] No se pudo expulsar:`, error)
          }
        }

        await sock.sendMessage(jid, {
          text: `${cfg.icono} *${cfg.label.toUpperCase()}*\n\n@${numeroRemitente}, los ${cfg.item} no están permitidos en este grupo.\nAviso: *${aviso.count}/${aviso.maxAvisos}*${expulsado ? '\n🚫 Usuario expulsado al alcanzar el límite.' : ''}`,
          mentions: [remitente],
        })
      } catch (error) {
        console.error(`[${cfg.name.toUpperCase()}] Error:`, error)
      }
    },
  }
}

module.exports = { crearComandoAntiMedia }