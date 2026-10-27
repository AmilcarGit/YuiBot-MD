// .verunavez — revela una foto, video o audio de "ver una vez" al responderle.
const { caja } = require('../../lib/estilo')
const vista = require('../../lib/verUnaVez')

module.exports = {
  name: 'verunavez',
  aliases: ['vv', 'viewonce', 'readviewonce', 'unavez'],
  description: 'Responde a una foto, video o audio de "ver una vez" para verlo de nuevo (agrega priv para recibirlo por privado)',
  category: 'media',

  async execute(sock, msg, args, { config }) {
    const jid = msg.key.remoteJid
    const P = config.PREFIXES[0]
    const responder = (text) => sock.sendMessage(jid, { text }, { quoted: msg })
    const media = vista.extraerMedia(msg)
    if (!media) {
      return responder(caja('👁️', 'Ver una vez', [
        'Responde a una foto, video o audio de "ver una vez" con:',
        `${P}verunavez   (o ${P}vv)`,
        `${P}vv priv   → te lo envío por privado`,
      ], 'Funciona con lo que llegó a este chat'))
    }
    if (!media.vistaUnica) return responder('ℹ️ Ese archivo no es de "ver una vez": ya puedes abrirlo normalmente.')

    const privado = args.some((a) => ['priv', 'privado', '-p'].includes(a.toLowerCase()))
    const quien = (msg.key.participantAlt || msg.key.participant || jid).split('@')[0].split(':')[0]
    const destino = privado ? `${quien}@s.whatsapp.net` : jid
    try {
      const buffer = await vista.descargar(media)
      await sock.sendMessage(destino, vista.aContenido(media, buffer, '👁️ Revelado'), privado ? {} : { quoted: msg })
      try { await sock.sendMessage(jid, { react: { text: '👁️', key: msg.key } }) } catch { /* no es crítico */ }
      if (privado && destino !== jid) await responder('📩 Te lo envié por privado.')
    } catch (error) {
      console.error('[VERUNAVEZ]', error)
      await responder(`❌ No pude revelarlo: ${error.message || 'error desconocido'}\n\n_Si ya lo abrieron, WhatsApp puede haberlo borrado de sus servidores._`)
    }
  },
}
