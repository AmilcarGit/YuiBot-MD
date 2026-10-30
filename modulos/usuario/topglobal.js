// .topglobal — ranking de TODAS las instalaciones del bot (datos de la base compartida).
const S = require('../../lib/sincronizacion')
const { caja } = require('../../lib/estilo')

const CAMPOS = {
  monedas: ['💰', 'monedas', 'monedas'], dinero: ['💰', 'monedas', 'monedas'],
  xp: ['⭐', 'xp', 'XP'], nivel: ['⭐', 'xp', 'XP'],
  trabajos: ['⛏️', 'trabajos', 'ganadas con trabajos'], trabajo: ['⛏️', 'trabajos', 'ganadas con trabajos'],
  semana: ['📆', 'semana', 'XP esta semana'], semanal: ['📆', 'semana', 'XP esta semana'],
}

module.exports = {
  name: 'topglobal',
  aliases: ['rankingglobal', 'globaltop'],
  description: 'Ranking mundial entre todas las instalaciones: .topglobal [monedas|xp|trabajos|semana]',
  category: 'usuario',

  async execute(sock, msg, args, { config }) {
    const jid = msg.key.remoteJid
    const P = config.PREFIXES[0]
    const responder = (text) => sock.sendMessage(jid, { text }, { quoted: msg })
    const ajustes = S.leerAjustes(config)
    if (!ajustes.activo) return responder('🌐 La base compartida no está activada en este bot.')
    const clave = String(args[0] || 'monedas').toLowerCase()
    const campo = CAMPOS[clave]
    if (!campo) return responder(`🌐 Elige un ranking: *${P}topglobal monedas*, *xp*, *trabajos* o *semana*.`)
    try {
      const top = await S.topGlobal({ ajustes, campo: campo[1], limite: 10 })
      if (!top.length) return responder('📭 Todavía no hay datos en el ranking mundial. Vuelve en unos minutos.')
      const medallas = ['🥇', '🥈', '🥉']
      const filas = top.map((t) => `${medallas[t.pos - 1] || `${t.pos}.`} ${t.visible} — ${Number(t.valor).toLocaleString('es-PE')} ${campo[2]}`)
      return responder(caja('🌐', `Top mundial ${campo[1]}`, filas, `Todas las instalaciones de YuiBot-MD · ${P}topglobal monedas|xp|trabajos|semana`))
    } catch (e) {
      return responder(`❌ No pude consultar el ranking mundial: ${e.message}`)
    }
  },
}
