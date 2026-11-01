// .escudo — protección por grupo: antidelete, antispam, antiflood, antilink y silencios.
const { exigirAdmin, objetivoDe } = require('../../lib/adminGrupo')
const { caja, uso } = require('../../lib/estilo')
const E = require('../../lib/escudo')

const ATAJOS = { antidelete: 'antidelete', antispam: 'antispam', antiflood: 'antiflood', antilink: 'antilink', silenciar: 'silenciar', desilenciar: 'quitar', unmute: 'quitar' }
const SI = new Set(['on', 'activar', 'si', 'sí', '1', 'enable'])
const NO = new Set(['off', 'desactivar', 'no', '0', 'disable'])
const estado = (v) => (v ? '🟢 Activado' : '⚪ Apagado')

function panel(P, jid) {
  const c = E.configGrupo(jid)
  const filas = E.FUNCIONES.map((f) => [f === 'antidelete' ? '🗑️' : f === 'antispam' ? '📛' : f === 'antiflood' ? '🌊' : '🔗', `${f} · ${E.DESCRIPCION[f]}`, estado(c[f])])
  const sil = E.silenciados(jid)
  return caja('🛡️', 'Escudo del grupo', [
    ...filas.map(([i, a, b]) => `${i} ${a}\n   ${b}`),
    null,
    `🔇 Silenciados ahora: ${sil.length}`,
    null,
    `Castigo gradual: aviso → último aviso → silencio 10 min → silencio 1 h → expulsión (se olvida tras 24 h sin faltas).`,
  ], `${P}escudo <función> on/off · ${P}escudo todo on · ${P}escudo silenciar @user 30 · ${P}escudo quitar @user`)
}

module.exports = {
  name: 'escudo',
  aliases: ['antidelete', 'antispam', 'antiflood', 'antilink', 'silenciar', 'desilenciar', 'unmute'],
  description: 'Protege el grupo: antidelete, antispam, antiflood, antilink y silencios con castigo gradual',
  category: 'grupo',

  async execute(sock, msg, args, { config, commandName }) {
    const jid = msg.key.remoteJid
    const P = config.PREFIXES?.[0] || '.'
    const ctx = await exigirAdmin(sock, msg, config)
    if (!ctx) return
    const responder = (text, extra = {}) => sock.sendMessage(jid, { text, ...extra }, { quoted: msg })

    let partes = [...args]
    const atajo = ATAJOS[String(commandName || '').toLowerCase()]
    if (atajo) partes = [atajo, ...partes]
    const sub = String(partes[0] || '').toLowerCase()

    if (!sub || sub === 'panel' || sub === 'estado') return responder(panel(P, jid))

    if (E.FUNCIONES.includes(sub) || sub === 'todo') {
      const v = String(partes[1] || '').toLowerCase()
      let nuevo
      if (SI.has(v)) nuevo = true
      else if (NO.has(v)) nuevo = false
      else if (!v && sub !== 'todo') nuevo = !E.configGrupo(jid)[sub]
      else return responder(uso(P, 'escudo', `${sub} on`, 'Dime si lo quieres activar o apagar.'))
      const cambios = sub === 'todo' ? Object.fromEntries(E.FUNCIONES.map((f) => [f, nuevo])) : { [sub]: nuevo }
      E.ajustar(jid, cambios)
      let nota = ''
      if (nuevo && sub !== 'antidelete') {
        const yo = ctx.metadata.participants.find((p) => [sock.user?.id, sock.user?.lid].filter(Boolean).some((x) => String(x).split(':')[0].split('@')[0] === String(p.id || '').split(':')[0].split('@')[0]))
        if (!(yo?.admin === 'admin' || yo?.admin === 'superadmin')) nota = '\n\n⚠️ Para borrar mensajes y expulsar necesito ser administrador del grupo.'
      }
      return responder(`${nuevo ? '🟢' : '⚪'} ${sub === 'todo' ? 'Todo el escudo' : sub} ${nuevo ? 'activado' : 'apagado'}.${nota}`)
    }

    if (sub === 'silenciar') {
      const objetivo = objetivoDe(msg, partes.slice(1))
      if (!objetivo) return responder(uso(P, 'escudo', 'silenciar @usuario 30', 'Menciona o cita a quién silenciar.'))
      const min = Math.min(1440, Math.max(1, parseInt(partes.slice(1).find((a) => /^\d{1,4}$/.test(a)) || '30', 10)))
      E.silenciar(jid, objetivo, min * 60000)
      return responder(`🔇 @${objetivo} fue silenciado ${min} min. El bot borrará sus mensajes.`, { mentions: [`${objetivo}@s.whatsapp.net`] })
    }

    if (sub === 'quitar' || sub === 'reset') {
      const objetivo = objetivoDe(msg, partes.slice(1))
      if (!objetivo) return responder(uso(P, 'escudo', 'quitar @usuario', 'Menciona o cita a quién quitar el silencio.'))
      const ok = E.levantar(jid, objetivo, { limpiarPuntos: true })
      return responder(ok ? `🔊 @${objetivo} ya puede escribir y sus faltas quedaron en cero.` : `ℹ️ @${objetivo} no tenía silencio ni faltas.`, { mentions: [`${objetivo}@s.whatsapp.net`] })
    }

    if (sub === 'silenciados' || sub === 'lista') {
      const sil = E.silenciados(jid)
      if (!sil.length) return responder('✅ Nadie está silenciado ahora mismo.')
      return responder(caja('🔇', 'Silenciados', sil.map((s) => `@${s.numero} — faltan ${E.textoDuracion(s.restanteMs)}`)), { mentions: sil.map((s) => `${s.numero}@s.whatsapp.net`) })
    }

    return responder(panel(P, jid))
  },
}
