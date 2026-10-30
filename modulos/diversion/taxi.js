const T = require('../../lib/trabajos')
const { mostrarResultado, enviarConBotones } = require('../../lib/comandosTrabajo')
const { numeroUsuario } = require('../../lib/juegos')
const { caja } = require('../../lib/estilo')

const DEF = { emoji: '🚕', titulo: 'Taxi', espera: T.ESPERA_TAXI }

module.exports = {
  name: 'taxi',
  aliases: ['conducir'],
  description: 'Maneja el taxi: elige ruta corta, media o larga; más riesgo, más propina (cada 15 min)',
  category: 'diversion',

  async execute(sock, msg, args, { config }) {
    const jid = msg.key.remoteJid
    const P = config.PREFIXES[0]
    const numero = numeroUsuario(msg)
    const ruta = String(args[0] || '').toLowerCase()

    if (!T.RUTAS[ruta]) {
      const falta = T.restante(numero, 'taxi', T.esperaEfectiva(numero, T.ESPERA_TAXI))
      const filas = Object.entries(T.RUTAS).map(([k, r]) => [r.nombre, `${r.min}-${r.max} monedas · ${Math.round(r.exito * 100)}% · ${r.riesgo}`, '🛣️'])
      const texto = caja('🚕', 'Taxi', [...filas, falta ? ['Disponible en', T.formatoTiempo(falta), '⏳'] : null].filter(Boolean), `Elige tu ruta · ${P}taxi corta|media|larga`)
      return enviarConBotones(sock, jid, msg, config, texto, Object.entries(T.RUTAS).map(([k, r]) => ({ text: `🛣️ ${k[0].toUpperCase()}${k.slice(1)}`, id: `${P}taxi ${k}` })))
    }

    const espera = T.esperaEfectiva(numero, T.ESPERA_TAXI)
    const cd = T.usarCooldown(numero, 'taxi', espera)
    if (!cd.ok) return enviarConBotones(sock, jid, msg, config, `⏳ El taxi está en el taller.\nVuelve en *${T.formatoTiempo(cd.restanteMs)}*.`, [{ text: '🧰 Mis trabajos', id: `${P}trabajos` }])
    const resultado = T.conMejoras(numero, 'taxi', T.resolverTaxi(ruta))
    const cobro = T.aplicar(numero, resultado.ganancia)
    T.registrar(numero, 'taxi', cobro.delta)
    return mostrarResultado(sock, jid, msg, config, { ...DEF, espera }, resultado, cobro)
  },
}
