//CÓDIGO ORIGINAL DE YUIBOT-MD
const antiraid = require('../../lib/antiraid')
const antifake = require('../../lib/antifake')
const antibot = require('../../lib/antibot')
const antiMedia = require('../../lib/antiMedia')
const antiinsultos = require('../../lib/antiinsultos')

function estado(bool) {
  return bool ? 'ON ✅' : 'OFF ❌'
}

module.exports = {
  name: 'gpanel',
  aliases: ['panelgrupo'],
  description: 'Muestra el estado de todos los filtros de moderación del grupo',
  category: 'grupo',

  async execute(sock, msg, args, { config }) {
    const jid = msg.key.remoteJid
    if (!jid.endsWith('@g.us')) {
      return sock.sendMessage(jid, { text: '❌ Este comando solo funciona en grupos.' }, { quoted: msg })
    }

    const media = antiMedia.estadoGrupo(jid)
    const raid = antiraid.obtenerConfig(jid)
    const fake = antifake.obtenerConfig(jid)

    const texto = [
      '🛡️ *PANEL DE MODERACIÓN DEL GRUPO*',
      '',
      `Antilink: *${estado(config.MODERACION?.ANTILINK?.ENABLED)}*`,
      `Antiflood: *${estado(config.MODERACION?.ANTIFLOOD?.ENABLED)}*`,
      `Antiraid: *${estado(raid.enabled)}* (${raid.limite} entradas / ${raid.ventanaSegundos}s)`,
      `Antifake: *${estado(fake.enabled)}* (${fake.prefijos.join(', ')})`,
      `Antibot: *${estado(antibot.estaActivo(jid))}*`,
      `Antiinsultos: *${estado(antiinsultos.estaActivo(jid))}*`,
      `Antiimagen: *${estado(media.image)}*`,
      `Antisticker: *${estado(media.sticker)}*`,
      `Antivideo: *${estado(media.video)}*`,
      `Antiaudio: *${estado(media.audio)}*`,
      `Antidocumento: *${estado(media.document)}*`,
      `Bienvenida: *${estado(config.WELCOME_ENABLED)}*`,
      '',
      'Usa cada comando (ej: *antiraid on*, *antiimagen off*) para cambiar su estado.',
    ].join('\n')

    return sock.sendMessage(jid, { text: texto }, { quoted: msg })
  },
}