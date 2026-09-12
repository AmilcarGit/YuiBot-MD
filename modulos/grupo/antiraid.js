//CÓDIGO ORIGINAL DE YUIBOT-MD
const { esAdminDeGrupo } = require('../../lib/moderacion')
const { obtenerConfig, guardarConfig, registrarEntradas, limpiarEntradas } = require('../../lib/antiraid')

const timersDesbloqueo = new Map()

function programarDesbloqueo(sock, jidGrupo, cfg) {
  clearTimeout(timersDesbloqueo.get(jidGrupo))
  const delay = Math.max(1000, cfg.bloqueadoHasta - Date.now())
  const timer = setTimeout(async () => {
    try {
      await sock.groupSettingUpdate(jidGrupo, 'not_announcement')
      guardarConfig(jidGrupo, { bloqueadoHasta: 0 })
      await sock.sendMessage(jidGrupo, { text: '✅ *ANTIRAID*: el grupo fue abierto automáticamente.' })
    } catch (error) {
      console.error('[ANTIRAID] Error al reabrir el grupo:', error)
    }
    timersDesbloqueo.delete(jidGrupo)
  }, delay)
  timer.unref?.()
  timersDesbloqueo.set(jidGrupo, timer)
}

module.exports = {
  name: 'antiraid',
  description: 'Cierra el grupo temporalmente ante entradas masivas de miembros',
  category: 'grupo',

  async execute(sock, msg, args, { config }) {
    const jid = msg.key.remoteJid
    if (!jid.endsWith('@g.us')) {
      return sock.sendMessage(jid, { text: '❌ Este comando solo funciona en grupos.' }, { quoted: msg })
    }

    let metadata
    try {
      metadata = await sock.groupMetadata(jid)
    } catch (error) {
      console.error('[ANTIRAID]', error)
      return sock.sendMessage(jid, { text: '❌ No se pudo obtener la información del grupo.' }, { quoted: msg })
    }

    const remitente = msg.key.participantAlt || msg.key.participant || jid
    const numeroRemitente = remitente.split('@')[0].split(':')[0]
    const esAdmin = esAdminDeGrupo(metadata, numeroRemitente)
    const esOwnerBot = config.OWNERS.some((o) => o.numero === numeroRemitente)
    if (!esAdmin && !esOwnerBot) {
      return sock.sendMessage(jid, { text: '⛔ Solo los administradores del grupo pueden usar este comando.' }, { quoted: msg })
    }

    const accion = (args[0] || 'status').toLowerCase()

    if (accion === 'on' || accion === 'off') {
      const cfg = guardarConfig(jid, { enabled: accion === 'on' })
      return sock.sendMessage(jid, { text: `🛡️ AntiRaid: *${cfg.enabled ? 'ON ✅' : 'OFF ❌'}*` }, { quoted: msg })
    }

    if (accion === 'config') {
      const actual = obtenerConfig(jid)
      const limite = Math.max(3, Math.min(30, Number(args[1]) || actual.limite))
      const ventanaSegundos = Math.max(5, Math.min(120, Number(args[2]) || actual.ventanaSegundos))
      const minutosBloqueo = Math.max(1, Math.min(60, Number(args[3]) || actual.minutosBloqueo))
      guardarConfig(jid, { limite, ventanaSegundos, minutosBloqueo })
      return sock.sendMessage(jid, { text: `AntiRaid: *${limite} entradas / ${ventanaSegundos}s*, cierre *${minutosBloqueo} min*.` }, { quoted: msg })
    }

    const cfg = obtenerConfig(jid)
    return sock.sendMessage(jid, {
      text: `🛡️ *ANTIRAID*\n\nEstado: *${cfg.enabled ? 'ON' : 'OFF'}*\nLímite: *${cfg.limite} entradas / ${cfg.ventanaSegundos}s*\nCierre: *${cfg.minutosBloqueo} min*\n\nantiraid on|off\nantiraid config 5 20 5`,
    }, { quoted: msg })
  },

  async onGroupUpdate(sock, update) {
    if (!update?.id || String(update.action).toLowerCase() !== 'add') return

    const cfg = obtenerConfig(update.id)
    if (!cfg.enabled) return

    const ahora = Date.now()
    const ventanaMs = cfg.ventanaSegundos * 1000
    const cantidad = registrarEntradas(update.id, (update.participants || []).length, ventanaMs)

    if (cantidad < cfg.limite || cfg.bloqueadoHasta > ahora) return

    try {
      await sock.groupSettingUpdate(update.id, 'announcement')
      const nuevoCfg = guardarConfig(update.id, { bloqueadoHasta: ahora + cfg.minutosBloqueo * 60000 })
      limpiarEntradas(update.id)
      await sock.sendMessage(update.id, {
        text: `🚨 *ANTIRAID ACTIVADO*\n\nDetecté *${cantidad} entradas* en pocos segundos.\nEl grupo fue cerrado por *${cfg.minutosBloqueo} minutos*.`,
      })
      programarDesbloqueo(sock, update.id, nuevoCfg)
    } catch (error) {
      console.error('[ANTIRAID] No se pudo cerrar el grupo (¿el bot es admin?):', error)
      await sock.sendMessage(update.id, { text: '⚠️ AntiRaid detectó entradas masivas, pero necesito ser administrador del grupo para cerrarlo.' })
    }
  },
}