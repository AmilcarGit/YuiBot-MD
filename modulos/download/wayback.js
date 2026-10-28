const dw = require('../../lib/descargaWeb')
const { mensajeError } = require('../../lib/comandosDescarga')
const { caja, uso, espera } = require('../../lib/estilo')

module.exports = {
  name: 'wayback',
  aliases: ['archivoweb', 'webarchive'],
  description: 'Mira cómo era una página antes (Wayback Machine): .wayback <enlace> [año] o guardar',
  category: 'download',

  async execute(sock, msg, args, { config }) {
    const jid = msg.key.remoteJid
    const P = config.PREFIXES[0]
    const entrada = dw.extraerUrl(args.join(' ')) || args[0]
    const url = entrada && dw.urlSegura(entrada)
    if (!url) return sock.sendMessage(jid, { text: uso(P, 'wayback', 'https://example.com 2019', `Añade un año (o AAAAMMDD) para ver esa época, o "guardar" para archivarla hoy.`) }, { quoted: msg })
    const guardar = args.some((a) => ['guardar', 'save'].includes(a.toLowerCase()))
    const fecha = args.find((a) => /^\d{4}(\d{2}(\d{2})?)?$/.test(a)) || ''
    try {
      await sock.sendMessage(jid, { text: espera(guardar ? 'Guardando la página en Archive.org (puede tardar)...' : 'Buscando copias archivadas...') }, { quoted: msg })
      const r = await dw.wayback(url, { fecha, guardar })
      if (!r) return sock.sendMessage(jid, { text: `📭 No hay copias archivadas de esa página.\n\nPuedes crear una con *${P}wayback ${url} guardar*` }, { quoted: msg })
      await sock.sendMessage(jid, { text: caja('🕰️', r.guardada ? 'Página guardada' : 'Copia archivada', [r.fecha ? ['Fecha', r.fecha, '📅'] : null, ['Página', url.slice(0, 60), '🌐']].filter(Boolean), r.url) }, { quoted: msg })
    } catch (error) {
      console.error('[WAYBACK]', error)
      await sock.sendMessage(jid, { text: mensajeError(error) }, { quoted: msg })
    }
  },
}
