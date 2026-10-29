const dw = require('../../lib/descargaWeb')
const { descargarYEnviar, mensajeError } = require('../../lib/comandosDescarga')
const { caja, uso } = require('../../lib/estilo')
const { conReaccion } = require('../../lib/reaccion')
const { descargarLocal, ytDlpDisponible } = require('../../lib/youtube')

module.exports = {
  name: 'dl',
  aliases: ['bajarlink', 'descargalink'],
  description: 'Descarga cualquier enlace soportado (TikTok, YouTube, X, Instagram, Reddit, MediaFire…): .dl <enlace> [audio]',
  category: 'download',

  async execute(sock, msg, args, ctx) {
    const { config, commands } = ctx
    const jid = msg.key.remoteJid
    const P = config.PREFIXES[0]
    const url = dw.extraerUrl(args.join(' ')) || dw.extraerUrl(msg.message?.extendedTextMessage?.contextInfo?.quotedMessage?.conversation)
    if (!url) {
      const lista = dw.SITIOS.map((s) => `${s.emoji} ${s.nombre}`)
      return sock.sendMessage(jid, { text: `${uso(P, 'dl', 'https://vm.tiktok.com/abc123 audio', 'Pega un enlace (o responde a un mensaje que lo tenga). Con "audio" bajo solo el sonido.')}\n\n${caja('🌐', 'Sitios soportados', lista.map((l) => `┃ ${l}`))}` }, { quoted: msg })
    }
    const audio = args.some((a) => ['audio', 'mp3'].includes(a.toLowerCase()))
    const sitio = dw.detectarSitio(url)

    // Sitios que ya tienen su propio comando (con sus respaldos): se delega.
    if (sitio?.comando) {
      const nombre = audio ? sitio.comandoAudio || (sitio.soloComando ? sitio.comando : null) : sitio.comando
      const cmd = nombre && commands?.get(nombre)
      if (cmd) return cmd.execute(sock, msg, [url], { ...ctx, commandName: nombre })
    }
    // Redes y archivos que se resuelven aquí.
    if (sitio && !sitio.comando) return descargarYEnviar(sock, msg, sitio.clave, url, audio ? 'audio' : 'video')

    // Cualquier otra página: lo intenta yt-dlp (soporta cientos de sitios).
    if (!dw.urlSegura(url)) return sock.sendMessage(jid, { text: '❌ Ese enlace no es válido o apunta a una dirección privada.' }, { quoted: msg })
    try {
      if (!(await ytDlpDisponible())) throw new Error('No reconozco ese sitio y yt-dlp no está instalado (en Termux: `pkg install yt-dlp ffmpeg`)')
      await conReaccion(sock, msg, async () => {
        const r = await descargarLocal(url, audio ? 'audio' : 'video')
        await dw.enviarResultado(sock, msg, jid, {
          kind: 'medios', titulo: r.titulo, autor: r.canal,
          medios: [{ tipo: audio ? 'audio' : 'video', buffer: r.buffer, nombre: audio ? 'audio.mp3' : 'video.mp4' }],
        }, { sitioInfo: { emoji: '🌐', nombre: 'Descarga' } })
      })
    } catch (error) {
      console.error('[DL]', error)
      await sock.sendMessage(jid, { text: mensajeError(error) }, { quoted: msg })
    }
  },
}
