// .misiones — 3 misiones diarias con premio y bono por racha.
const M = require('../../lib/misiones')
const { caja } = require('../../lib/estilo')
const { numeroUsuario } = require('../../lib/juegos')
const { enviarConRespaldo } = require('../../lib/whatsapp/interactivos')

const barra = (a, m) => { const n = Math.round((a / m) * 8); return '▰'.repeat(n) + '▱'.repeat(8 - n) }
const num = (n) => Number(n).toLocaleString('es-PE')

module.exports = {
  name: 'misionesdia',
  aliases: ['misionesdiarias', 'retodiario', 'quests'],
  description: 'Tus 3 misiones económicas del día: complétalas y reclama monedas (bono por racha)',
  category: 'diversion',

  async execute(sock, msg, args, { config }) {
    const jid = msg.key.remoteJid
    const P = config.PREFIXES[0]
    const numero = numeroUsuario(msg)
    const enviar = (texto, botones) => {
      const intentos = []
      if (botones?.length) intentos.push(['botones', { text: texto, footer: config.BOT_NAME || 'YuiBot-MD', buttons: botones.slice(0, 3) }])
      intentos.push(['texto', { text: texto }])
      return enviarConRespaldo(sock, jid, intentos, { quoted: msg }, 'MISIONES')
    }
    const sub = String(args[0] || '').toLowerCase()

    if (['reclamar', 'cobrar', 'claim', 'premio'].includes(sub)) {
      const r = M.reclamar(numero)
      if (!r.ok) return enviar(r.motivo === 'todo' ? '✅ Ya reclamaste todo lo de hoy. Mañana hay misiones nuevas.' : `⏳ Aún no completaste ninguna misión.\n\nMira tu avance con *${P}misionesdia*`, [{ text: '📋 Mis misiones', id: `${P}misionesdia` }, { text: '🧰 Trabajos', id: `${P}trabajos` }])
      const filas = r.nuevas.map((m) => [m.texto, `+${num(m.premio)}`, m.icono])
      if (r.bono) filas.push([`Bono 3/3 · racha ${r.racha} día${r.racha === 1 ? '' : 's'}`, `+${num(r.bono)}`, '🔥'])
      filas.push(['Total cobrado', `${num(r.ganado)} monedas`, '💰'], ['Saldo', `${num(r.saldo)} monedas`, '🏦'])
      return enviar(caja('🎉', 'Misiones cobradas', filas, 'Vuelve mañana por nuevas misiones ✨'), [{ text: '📋 Mis misiones', id: `${P}misionesdia` }, { text: '🧰 Trabajos', id: `${P}trabajos` }])
    }

    const e = M.estado(numero)
    const filas = []
    for (const m of e.misiones) {
      const marca = m.reclamada ? '✅ cobrada' : m.completa ? '🟢 lista' : `${num(m.actual)}/${num(m.meta)}`
      filas.push(`${m.icono} ${m.texto}\n   ${barra(m.actual, m.meta)} ${marca} · 🎁 ${num(m.premio)}`)
    }
    const listas = e.misiones.filter((m) => m.completa && !m.reclamada).length
    filas.push(null, `🔥 Racha: ${e.racha} día${e.racha === 1 ? '' : 's'}`, `🎯 Bono por las 3: ${e.bonoReclamado ? 'cobrado ✅' : `+${num(e.bonoPotencial)} monedas`}`)
    const botones = listas ? [{ text: `🎁 Reclamar (${listas})`, id: `${P}misionesdia reclamar` }, { text: '🧰 Trabajos', id: `${P}trabajos` }] : [{ text: '🧰 Trabajos', id: `${P}trabajos` }, { text: '🎁 Daily', id: `${P}daily` }]
    return enviar(caja('📋', 'Misiones de hoy', filas, `Se reinician a medianoche · ${P}misionesdia reclamar`), botones)
  },
}
