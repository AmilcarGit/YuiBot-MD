// .upgrades — tienda de mejoras para los trabajos (pago, espera, multas, granja).
const T = require('../../lib/trabajos')
const { enviarConBotones } = require('../../lib/comandosTrabajo')
const { numeroUsuario } = require('../../lib/juegos')
const { caja, negrita } = require('../../lib/estilo')
const { enviarConRespaldo } = require('../../lib/whatsapp/interactivos')

const barra = (n, max) => '▰'.repeat(n) + '▱'.repeat(max - n)

module.exports = {
  name: 'upgrades',
  aliases: ['mejoratrabajo', 'tallertrabajo'],
  description: 'Tienda de mejoras para tus trabajos: más pago, menos espera, menos multas y más parcelas',
  category: 'diversion',

  async execute(sock, msg, args, { config }) {
    const jid = msg.key.remoteJid
    const P = config.PREFIXES[0]
    const numero = numeroUsuario(msg)
    const accion = String(args[0] || '').toLowerCase()

    if (['comprar', 'buy', 'subir'].includes(accion)) {
      const clave = T.resolverMejora(args.slice(1).join(' '))
      if (!clave) return enviarConBotones(sock, jid, msg, config, `🛠️ No encuentro esa mejora.\nMira la lista con *${P}upgrades*.`, [{ text: '🛠️ Ver mejoras', id: `${P}upgrades` }])
      const m = T.MEJORAS[clave]
      const r = T.comprarMejora(numero, clave)
      if (!r.ok && r.motivo === 'max') return enviarConBotones(sock, jid, msg, config, `🏅 ${m.icono} *${m.nombre}* ya está al máximo (nivel ${T.maxNivel(clave)}).`, [{ text: '🛠️ Ver mejoras', id: `${P}upgrades` }])
      if (!r.ok) return enviarConBotones(sock, jid, msg, config, `💸 Te faltan *${T.dinero(r.faltan)}* monedas para subir ${m.icono} *${m.nombre}* (cuesta ${T.dinero(r.costo)}).\n\n🧰 Gana más con *${P}trabajos*`, [{ text: '🧰 Mis trabajos', id: `${P}trabajos` }, { text: '🛠️ Ver mejoras', id: `${P}upgrades` }])
      const sig = T.precioSiguiente(numero, clave)
      const filas = [
        ['Mejora', `${m.icono} ${m.nombre}`, '🛠️'],
        ['Nivel', `${r.nivel}/${T.maxNivel(clave)}  ${barra(r.nivel, T.maxNivel(clave))}`, '📈'],
        ['Efecto', m.efecto, '✨'],
        ['Pagaste', `${T.dinero(r.costo)} monedas`, '💸'],
        ['Saldo', `${T.dinero(r.saldo)} monedas`, '🏦'],
      ]
      const botones = [{ text: '🛠️ Más mejoras', id: `${P}upgrades` }, { text: '🧰 Mis trabajos', id: `${P}trabajos` }]
      if (sig) botones.unshift({ text: `⬆️ Subir (${T.dinero(sig)})`.slice(0, 20), id: `${P}upgrades comprar ${clave}` })
      return enviarConBotones(sock, jid, msg, config, caja('🛠️', '¡Mejora comprada!', filas, sig ? `Siguiente nivel: ${T.dinero(sig)} monedas` : '¡Nivel máximo!'), botones)
    }

    const filas = Object.entries(T.MEJORAS).map(([clave, m]) => {
      const nivel = T.nivelMejora(numero, clave)
      const sig = T.precioSiguiente(numero, clave)
      return [`${m.nombre}`, `${barra(nivel, T.maxNivel(clave))} ${sig ? `· sube por ${T.dinero(sig)}` : '· ¡MÁX!'}`, m.icono]
    })
    filas.push(['Tu saldo', `${T.dinero(require('../../lib/juegos').saldo(numero))} monedas`, '🏦'])
    const texto = `${caja('🛠️', 'Mejoras', filas, `${P}upgrades comprar <nombre> · ej: ${P}upgrades comprar pico`)}\n\n${negrita('Qué hace cada una')}\n${Object.values(T.MEJORAS).map((m) => `${m.icono} ${m.efecto}`).join('\n')}`

    const rows = Object.entries(T.MEJORAS).map(([clave, m]) => {
      const nivel = T.nivelMejora(numero, clave)
      const sig = T.precioSiguiente(numero, clave)
      return { title: `${m.icono} ${m.nombre}`.slice(0, 24), description: (sig ? `Nv ${nivel}/${T.maxNivel(clave)} → ${nivel + 1} por ${T.dinero(sig)} · ` : `Nv ${nivel}/${T.maxNivel(clave)} MÁX · `).concat(m.efecto).slice(0, 72), id: `${P}upgrades comprar ${clave}` }
    })
    const intentos = []
    if (config.MENU_LISTA !== false) intentos.push(['lista', { text: texto, footer: config.BOT_NAME || 'YuiBot-MD', buttons: [{ text: '🛠️ Comprar mejora', sections: [{ title: '🛠️ Mejoras', rows }] }] }])
    intentos.push(['texto', { text: texto }])
    return enviarConRespaldo(sock, jid, intentos, { quoted: msg }, 'UPGRADES')
  },
}
