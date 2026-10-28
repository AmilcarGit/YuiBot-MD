// .verunavez — revela una foto, video o audio de "ver una vez" al responderle.
const { caja } = require('../../lib/estilo')
const vista = require('../../lib/verUnaVez')
const { jidPrivado } = require('../../lib/jids')

module.exports = {
  name: 'verunavez',
  aliases: ['vv', 'viewonce', 'readviewonce', 'unavez'],
  description: 'Responde a una foto, video o audio de "ver una vez" y te lo envío a tu privado (agrega aqui para verlo en el chat)',
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
        'Te lo envío a tu privado, sin avisar en el chat.',
        `${P}vv aqui   → lo muestro en este mismo chat`,
      ], 'Funciona con lo que llegó a este chat'))
    }
    if (!media.vistaUnica) return responder('ℹ️ Ese archivo no es de "ver una vez": ya puedes abrirlo normalmente.')
    if (media.sinClave) {
      return responder(caja('👁️', 'Ver una vez', [
        'No pude abrirlo: ese mensaje llegó cuando el bot no estaba conectado (o se reinició después).',
        'WhatsApp no deja abrir un "ver una vez" desde la respuesta; el bot tiene que haberlo recibido en vivo.',
        'La próxima vez que lo envíen, responde con el comando mientras el bot esté activo.',
      ]))
    }

    // Por defecto va al privado de quien lo pide (si ya está en un privado, se queda ahí).
    const aqui = args.some((a) => ['aqui', 'aquí', 'chat', 'grupo', 'here'].includes(a.toLowerCase()))
    const destino = aqui || !jid.endsWith('@g.us') ? jid : jidPrivado(msg, sock)
    const privado = destino !== jid
    try {
      const buffer = await vista.descargar(media)
      await sock.sendMessage(destino, vista.aContenido(media, buffer, '👁️ Revelado'), privado ? {} : { quoted: msg })
      try { await sock.sendMessage(jid, { react: { text: '👁️', key: msg.key } }) } catch { /* no es crítico */ }
    } catch (error) {
      console.error('[VERUNAVEZ]', error)
      await responder(`❌ No pude revelarlo: ${error.message || 'error desconocido'}\n\n_Si ya lo abrieron, WhatsApp puede haberlo borrado de sus servidores._`)
    }
  },
}
