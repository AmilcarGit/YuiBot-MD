const T = require('../../lib/trabajos')
const { enviarConBotones } = require('../../lib/comandosTrabajo')
const { numeroUsuario } = require('../../lib/juegos')
const { caja } = require('../../lib/estilo')

module.exports = {
  name: 'granja',
  aliases: ['huerto', 'cultivo'],
  description: 'Tu granja (3 parcelas, más con mejoras): .granja plantar <papa|maiz|tomate|fresa|cacao> y luego .granja cosechar',
  category: 'diversion',

  async execute(sock, msg, args, { config }) {
    const jid = msg.key.remoteJid
    const P = config.PREFIXES[0]
    const numero = numeroUsuario(msg)
    const accion = String(args[0] || '').toLowerCase()

    if (['cosechar', 'recoger'].includes(accion)) {
      const r = T.cosechar(numero)
      if (!r.ok) {
        const texto = r.faltan == null ? `🌱 No tienes nada plantado.\nUsa *${P}granja plantar papa*.` : `🌱 Aún no está listo. Falta *${T.formatoTiempo(r.faltan)}*.`
        return enviarConBotones(sock, jid, msg, config, texto, [{ text: '🌾 Mi granja', id: `${P}granja` }])
      }
      const lista = Object.entries(r.detalle).map(([nombre, d]) => `${d.n}× ${nombre} ${d.icono}`).join(', ')
      return enviarConBotones(sock, jid, msg, config, caja('🌾', 'Cosecha', [['Recogiste', lista, '🧺'], ['Ganaste', `+${T.dinero(r.ganado)} monedas`, '💰'], ['Saldo', `${T.dinero(r.saldo)} monedas`, '🏦']], `Vuelve a plantar · ${P}granja`), [{ text: '🌱 Plantar papa', id: `${P}granja plantar papa` }, { text: '🧰 Mis trabajos', id: `${P}trabajos` }])
    }

    if (['plantar', 'sembrar'].includes(accion)) {
      const clave = T.resolverCultivo(args[1])
      if (!clave) {
        const lista = Object.values(T.CULTIVOS).map((c) => `${c.icono} ${c.nombre}: ${T.formatoTiempo(T.tiempoCrecimiento(numero, c.tiempo))} → ~${c.pago} monedas`).join('\n')
        return enviarConBotones(sock, jid, msg, config, `🌱 Elige qué plantar:\n\n${lista}\n\n▶️ Ejemplo: *${P}granja plantar fresa*`, Object.keys(T.CULTIVOS).slice(0, 3).map((k) => ({ text: `${T.CULTIVOS[k].icono} ${T.CULTIVOS[k].nombre}`, id: `${P}granja plantar ${k}` })))
      }
      const cantidad = Number.isInteger(Number(args[2])) && Number(args[2]) > 0 ? Number(args[2]) : null
      const r = T.plantar(numero, clave, cantidad)
      if (!r.ok) return enviarConBotones(sock, jid, msg, config, `🚜 Tus ${T.parcelasDe(numero)} parcelas están ocupadas. Cosecha primero con *${P}granja cosechar*.`, [{ text: '🌾 Mi granja', id: `${P}granja` }])
      return enviarConBotones(sock, jid, msg, config, caja('🌱', 'A sembrar', [['Plantaste', `${r.plantadas}× ${r.cultivo.nombre} ${r.cultivo.icono}`, '🌱'], ['Listo en', T.formatoTiempo(r.tiempo), '⏳']], `Cosecha con ${P}granja cosechar`), [{ text: '🧺 Cosechar', id: `${P}granja cosechar` }, { text: '🌾 Mi granja', id: `${P}granja` }])
    }

    const g = T.estadoGranja(numero)
    const filas = g.parcelas.map((p, i) => [`Parcela ${i + 1}`, `${p.cultivo.nombre} ${p.cultivo.icono} · ${p.listo ? '¡listo para cosechar!' : `faltan ${T.formatoTiempo(p.faltaMs)}`}`, p.listo ? '✅' : '🌱'])
    for (let i = 0; i < g.libres; i++) filas.push([`Parcela ${g.parcelas.length + i + 1}`, 'libre', '🟫'])
    const hayListo = g.parcelas.some((p) => p.listo)
    return enviarConBotones(sock, jid, msg, config, caja('🌾', 'Tu granja', filas, `${P}granja plantar <cultivo> · ${P}granja cosechar`), [
      ...(hayListo ? [{ text: '🧺 Cosechar', id: `${P}granja cosechar` }] : []),
      ...(g.libres ? [{ text: '🌱 Plantar', id: `${P}granja plantar` }] : []),
      { text: '🧰 Mis trabajos', id: `${P}trabajos` },
    ])
  },
}
