// .promediar — promedio rápido de notas (simple o ponderado).
const { caja } = require('../../lib/estilo')
const escuela = require('../../lib/escuela')

module.exports = {
  name: 'promediar',
  aliases: ['avg', 'sacarpromedio'],
  description: 'Promedio rápido: promediar 15 14 18 · con pesos: promediar 15x30 12x70',
  category: 'escuela',

  async execute(sock, msg, args, { config }) {
    const jid = msg.key.remoteJid
    const P = config.PREFIXES[0]
    const leidas = args.map((a) => escuela.leerNota(a))
    if (!args.length || leidas.some((x) => !x)) {
      return sock.sendMessage(jid, { text: `❌ Escribe notas de 0 a ${escuela.NOTA_MAX}.\n\n📌 Ejemplos:\n${P}promediar 15 14 18\n${P}promediar 15x30 12x70  (nota x peso)` }, { quoted: msg })
    }
    const prom = escuela.promedio(leidas)
    const ponderado = leidas.some((x) => x.peso !== 1)
    const mejor = Math.max(...leidas.map((x) => x.nota))
    const peor = Math.min(...leidas.map((x) => x.nota))
    return sock.sendMessage(jid, {
      text: caja('🧮', 'Promedio', [
        ['Notas', args.join('  '), '📝'],
        ['Tipo', ponderado ? 'Ponderado' : 'Simple', '⚖️'],
        ['Promedio', `${escuela.fmt(prom)} ${escuela.estadoNota(prom)}`, '📊'],
        ['Mejor / peor', `${escuela.fmt(mejor)} / ${escuela.fmt(peor)}`, '🏆'],
        ['Redondeado', Math.round(prom), '🎯'],
      ], prom >= escuela.NOTA_APROBAR ? '¡Aprobado! 🎉' : `Te falta ${escuela.fmt(escuela.NOTA_APROBAR - prom)} para aprobar (${escuela.NOTA_APROBAR})`),
    }, { quoted: msg })
  },
}
