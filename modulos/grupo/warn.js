const { exigirAdmin, objetivoDe, agregarWarn, participante, esAdmin, MAX_WARNS_DEFECTO } = require('../../lib/adminGrupo')
const { caja } = require('../../lib/estilo')

module.exports = {
  name: 'warn',
  aliases: ['advertir', 'advertencia'],
  description: 'Da una advertencia (cita o menciona); al llegar al máximo se expulsa',
  category: 'grupo',

  async execute(sock, msg, args, { config }) {
    const ctx = await exigirAdmin(sock, msg, config)
    if (!ctx) return
    const { jid, metadata } = ctx
    const responder = (text, mentions) => sock.sendMessage(jid, { text, mentions }, { quoted: msg })
    const objetivo = objetivoDe(msg, args)
    if (!objetivo) return responder(`❌ Cita o menciona a quién advertir.\n📌 Ejemplo: ${config.PREFIXES[0]}warn @usuario spam`)

    const miembro = participante(metadata, objetivo)
    if (!miembro) return responder('❌ Esa persona no está en el grupo.')
    if (esAdmin(miembro)) return responder('❌ No puedes advertir a un admin.')
    const yo = participante(metadata, sock.user?.id, sock.user?.lid)
    if (yo && miembro.id === yo.id) return responder('❌ No puedo advertirme a mí mismo.')

    const max = config.MODERACION?.WARNS?.MAX || MAX_WARNS_DEFECTO
    const motivo = args.filter((a) => !/^@?\d{6,}$/.test(a)).join(' ')
    const r = agregarWarn(jid, objetivo, motivo, max)
    const mencion = [miembro.id]
    if (!r.llego) return responder(caja('⚠️', 'Advertencia', [['Usuario', `@${objetivo}`], ['Advertencias', `${r.total}/${r.max}`], ['Motivo', motivo]], 'Cuidado con las reglas'), mencion)
    try {
      await sock.groupParticipantsUpdate(jid, [miembro.id], 'remove')
      return responder(caja('🚫', 'Usuario expulsado', [['Usuario', `@${objetivo}`], ['Motivo', `Llegó a ${r.max} advertencias y fue expulsado`]], 'Límite alcanzado'), mencion)
    } catch {
      return responder(`🚫 @${objetivo} llegó a ${r.max} advertencias, pero no pude expulsarlo (¿soy admin?).`, mencion)
    }
  },
}
