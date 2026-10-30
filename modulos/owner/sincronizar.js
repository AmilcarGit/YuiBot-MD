// .sincronizar — estado de la base de datos compartida (YuiBot-datos) y sincronización inmediata. Solo owners.
const S = require('../../lib/sincronizacion')
const { caja } = require('../../lib/estilo')

const hace = (t) => {
  if (!t) return 'nunca'
  const s = Math.round((Date.now() - t) / 1000)
  return s < 60 ? `hace ${s} s` : s < 3600 ? `hace ${Math.round(s / 60)} min` : `hace ${Math.round(s / 3600)} h`
}

module.exports = {
  name: 'sincronizar',
  aliases: ['syncnube', 'basecompartida'],
  description: 'Base de datos compartida entre instalaciones: .sincronizar (ahora) · estado',
  category: 'owner',
  ownerOnly: true,

  async execute(sock, msg, args, { esSubBot, config } = {}) {
    const jid = msg.key.remoteJid
    const responder = (text) => sock.sendMessage(jid, { text }, { quoted: msg })
    if (esSubBot) return responder('⛔ La sincronización solo se maneja desde el bot principal.')
    const ajustes = S.leerAjustes(config || {})
    if (!ajustes.activo) return responder(caja('☁️', 'Base compartida apagada', [['Motivo', ajustes.motivo, '❓']], 'Configura SYNC.URL en defaults.js o SYNC_URL en el .env'))

    if (['estado', 'status', 'info'].includes(String(args[0] || '').toLowerCase())) {
      const e = S.estado
      return responder(caja('☁️', 'Base compartida', [
        ['Servidor', ajustes.url, '🌐'],
        ['Automático', e.programado ? `cada ${Math.round(ajustes.intervaloMs / 60000 * 10) / 10} min${e.bloqueada ? ' (BLOQUEADA)' : ''}` : 'apagado (reinicia el bot)', '⏱️'],
        ['Última vez', hace(e.ultimoOk), '✅'],
        ['Usuarios del último envío', String(e.ultimosUsuarios), '👥'],
        e.ultimoError ? ['Último error', String(e.ultimoError).slice(0, 160), '⚠️'] : null,
      ].filter(Boolean)))
    }

    try {
      const r = await S.sincronizarAhora({ ajustes })
      if (r.ocupado) return responder('⏳ Ya hay una sincronización en curso.')
      return responder(caja('☁️', 'Sincronizado', [['Usuarios', String(r.enviados), '👥'], ['Lotes', String(r.lotes), '📦'], r.pendientes ? ['Faltan por enviar', `${r.pendientes} lote(s), en el próximo ciclo`, '⏳'] : null].filter(Boolean), 'Tus datos y los de las demás instalaciones ya están unidos'))
    } catch (e) {
      return responder(`❌ No pude sincronizar: ${e.message}\nSigo con los datos locales.`)
    }
  },
}
