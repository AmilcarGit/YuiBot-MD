// .respaldonube — respaldo de data/ en tu repositorio privado de GitHub (solo owners, solo bot principal).
const R = require('../../lib/respaldoNube')
const { caja } = require('../../lib/estilo')

const hace = (t) => {
  if (!t) return 'nunca'
  const s = Math.round((Date.now() - t) / 1000)
  if (s < 60) return `hace ${s} s`
  if (s < 3600) return `hace ${Math.round(s / 60)} min`
  if (s < 86400) return `hace ${Math.round(s / 3600)} h`
  return `hace ${Math.round(s / 86400)} d`
}

module.exports = {
  name: 'respaldonube',
  aliases: ['nubebackup', 'subirdatos'],
  description: 'Respaldo de datos en GitHub privado: .respaldonube (subir ahora) · estado · restaurar confirmar',
  category: 'owner',
  ownerOnly: true,

  async execute(sock, msg, args, { esSubBot, config } = {}) {
    const jid = msg.key.remoteJid
    const P = config?.PREFIXES?.[0] || '.'
    const responder = (text) => sock.sendMessage(jid, { text }, { quoted: msg })
    if (esSubBot) return responder('⛔ El respaldo solo se maneja desde el bot principal.')

    const ajustes = R.leerAjustes()
    const accion = String(args[0] || '').toLowerCase()

    if (!ajustes.activo) {
      return responder(caja('☁️', 'Respaldo apagado', [
        ['Motivo', ajustes.motivo, '❓'],
        ['Cómo activarlo', 'pon esto en tu archivo .env:', '🛠️'],
        '   RESPALDO_REPO=usuario/repo-privado',
        '   RESPALDO_TOKEN=tu_token',
      ], 'Luego reinicia el bot · el repo debe ser PRIVADO'))
    }

    if (['estado', 'status', 'info'].includes(accion)) {
      const e = R.estado
      return responder(caja('☁️', 'Respaldo en la nube', [
        ['Repositorio', ajustes.repo, '📦'],
        ['Automático', e.programado ? `cada ${ajustes.minutos} min` : 'apagado (reinicia el bot)', '⏱️'],
        ['Último éxito', hace(e.ultimoOk), '✅'],
        ['Archivos del último', String(e.ultimosArchivos), '🗂️'],
        ['Último commit', e.ultimoCommit || '—', '🔖'],
        e.ultimoError ? ['Último error', String(e.ultimoError).slice(0, 160), '⚠️'] : null,
      ].filter(Boolean), `${P}respaldonube para subir ahora`))
    }

    if (['restaurar', 'restore', 'bajar'].includes(accion)) {
      if (String(args[1] || '').toLowerCase() !== 'confirmar') {
        return responder(`⚠️ Esto *reemplaza* los datos actuales (monedas, niveles, grupos…) por el último respaldo.\nSe guarda antes una copia en la carpeta backups.\n\nSi estás seguro: *${P}respaldonube restaurar confirmar*`)
      }
      try {
        const r = await R.restaurar({ ajustes })
        if (r.vacio) return responder('📭 El repositorio todavía no tiene un respaldo de datos.')
        return responder(caja('☁️', 'Datos restaurados', [['Archivos', String(r.restaurados.length), '🗂️'], ['Copia anterior', r.copia ? 'guardada en backups/' : 'no había datos', '🛟']], 'Ya están en uso'))
      } catch (e) {
        return responder(`❌ No pude restaurar: ${R.tapar(e.message, ajustes.token)}\nTus datos actuales no se tocaron.`)
      }
    }

    try {
      const r = await R.respaldarAhora({ ajustes })
      if (r.ocupado) return responder('⏳ Ya hay un respaldo en curso, espera unos segundos.')
      if (r.vacio) return responder('📭 No hay archivos de datos para respaldar todavía.')
      if (r.sinCambios) return responder(caja('☁️', 'Todo al día', [['Repositorio', ajustes.repo, '📦'], ['Cambios', 'ninguno desde el último respaldo', '✅']]))
      return responder(caja('☁️', 'Respaldo listo', [
        ['Repositorio', ajustes.repo, '📦'],
        ['Archivos subidos', r.subidos.join(', ').slice(0, 200), '🗂️'],
        ['Commit', r.commit, '🔖'],
        r.saltados.length ? ['Saltados', r.saltados.join(', ').slice(0, 160), '⚠️'] : null,
      ].filter(Boolean), 'Guardado en tu repositorio privado'))
    } catch (e) {
      return responder(`❌ No pude subir el respaldo: ${R.tapar(e.message, ajustes.token)}`)
    }
  },
}
