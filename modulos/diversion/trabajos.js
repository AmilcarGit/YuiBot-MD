const T = require('../../lib/trabajos')
const { numeroUsuario } = require('../../lib/juegos')
const { caja } = require('../../lib/estilo')
const { enviarConRespaldo } = require('../../lib/whatsapp/interactivos')

module.exports = {
  name: 'trabajos',
  aliases: ['empleos', 'chambas'],
  description: 'Panel de las 10 formas de ganar monedas, con el tiempo que falta para cada una',
  category: 'diversion',

  async execute(sock, msg, args, { config }) {
    const jid = msg.key.remoteJid
    const P = config.PREFIXES[0]
    const numero = numeroUsuario(msg)
    const r = T.resumen(numero)
    const filas = r.filas.map((f) => [`${P}${f.nombre}`, f.detalle, f.emoji])
    const texto = caja('🧰', 'Ganar monedas', [...filas, ['Total ganado', `${T.dinero(r.ganado)} monedas`, '🏆'], ['Veces', String(r.veces), '🔁']], `Toca uno de la lista · ${config.BOT_NAME || 'YuiBot-MD'}`)
    const secciones = [{
      title: '🧰 Trabajos',
      rows: r.filas.map((f) => ({ title: `${f.emoji} ${P}${f.nombre}`.slice(0, 24), description: (f.listo ? '✅ Listo ahora · ' : '⏳ ') + f.detalle, id: `${P}${f.nombre}` })),
    }]
    const intentos = []
    if (config.MENU_LISTA !== false) intentos.push(['lista', { text: texto, footer: config.BOT_NAME || 'YuiBot-MD', buttons: [{ text: '🧰 Elegir trabajo', sections: secciones }] }])
    intentos.push(['texto', { text: texto }])
    return enviarConRespaldo(sock, jid, intentos, { quoted: msg }, 'TRABAJOS')
  },
}
