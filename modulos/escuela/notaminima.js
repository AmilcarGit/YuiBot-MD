// .notaminima — ¿qué nota necesito en lo que falta para llegar a mi meta?
const { caja } = require('../../lib/estilo')
const escuela = require('../../lib/escuela')

module.exports = {
  name: 'notaminima',
  aliases: ['cuantonecesito'],
  description: 'Calcula la nota que necesitas: notaminima 11 14 12 (meta y notas actuales)',
  category: 'escuela',

  async execute(sock, msg, args, { config }) {
    const jid = msg.key.remoteJid
    const P = config.PREFIXES[0]
    const responder = (text) => sock.sendMessage(jid, { text }, { quoted: msg })

    let falta = 1
    const tokens = []
    for (const a of args) {
      const m = a.toLowerCase().match(/^falta=(\d+(?:[.,]\d+)?)$/)
      if (m) falta = Number(m[1].replace(',', '.'))
      else tokens.push(a)
    }
    const meta = Number(String(tokens[0] || '').replace(',', '.'))
    const actuales = tokens.slice(1).map((t) => escuela.leerNota(t))

    if (!tokens.length || !Number.isFinite(meta) || meta <= 0 || meta > escuela.NOTA_MAX || actuales.some((x) => !x) || !(falta > 0)) {
      return responder(`❌ Escribe tu meta y tus notas actuales.\n\n📌 Ejemplos:\n${P}notaminima 11 14 12  (meta 11, te falta 1 nota)\n${P}notaminima 14 15 12 falta=2  (faltan 2 notas)\n${P}notaminima 11 14x30 10x20 falta=50  (con pesos)`)
    }
    const r = escuela.notaNecesaria(actuales, meta, falta)
    const veredicto = {
      ya: '🎉 ¡Ya alcanzaste tu meta! Aun con 0 en lo que falta.',
      imposible: `😬 Necesitarías ${escuela.fmt(r.necesaria)}, más que la nota máxima (${escuela.NOTA_MAX}). Con tus notas actuales no llegas a esa meta.`,
      posible: `🎯 Necesitas *${escuela.fmt(r.necesaria)}* ${falta === 1 ? 'en la nota que falta' : 'de promedio en lo que falta'}.`,
    }[r.estado]
    return responder(caja('🎯', 'Nota mínima', [
      ['Meta', meta, '🏁'],
      ['Notas actuales', actuales.length ? tokens.slice(1).join('  ') : '(ninguna)', '📝'],
      ['Falta', falta === 1 ? '1 nota' : `peso ${escuela.fmt(falta)}`, '⏳'],
    ], veredicto))
  },
}
