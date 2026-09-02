//CÓDIGO ORIGINAL DE YUIBOT-MD
const fs = require('fs')

const ORDEN_CATEGORIAS = ['main', 'usuario', 'grupo', 'download', 'media', 'diversion', 'utilidad', 'owner']

const CATEGORIAS = {
  main: { emoji: '🌸', titulo: 'PRINCIPAL' },
  usuario: { emoji: '👤', titulo: 'USUARIO' },
  grupo: { emoji: '👥', titulo: 'GRUPO' },
  download: { emoji: '📥', titulo: 'DESCARGAS' },
  media: { emoji: '🎨', titulo: 'MULTIMEDIA' },
  diversion: { emoji: '🎮', titulo: 'DIVERSIÓN' },
  utilidad: { emoji: '🛠️', titulo: 'UTILIDADES' },
  owner: { emoji: '👑', titulo: 'OWNER' },
}

function construirCaja(info, comandos, texto) {
  const unicos = [...new Set(comandos)]

  texto += `\n╭━━━〔 ${info.emoji} ${info.titulo} 〕━━━╮\n`
  unicos.forEach((cmd, i) => {
    texto += `┃ ❯ *${cmd.name}*\n`
    texto += `┃    _${cmd.description}_\n`
    if (i < unicos.length - 1) texto += `┃\n`
  })
  texto += `╰${'━'.repeat(info.titulo.length + 10)}╯\n`

  return texto
}

module.exports = {
  name: 'menu',
  aliases: ['ayuda', 'help'],
  description: 'Muestra la lista de comandos disponibles',
  category: 'main',

  async execute(sock, msg, args, { categories, commands, config }) {
    const jid = msg.key.remoteJid
    const nombreUsuario = msg.pushName || 'Usuario'
    const totalComandos = [...new Set(commands.values())].length

    let texto = `🌸 *YUIBOT-MD*\n\n`
    texto += `👤 Usuario: ${nombreUsuario}\n`
    texto += `⚡ Prefijo: ${config.PREFIXES[0]}\n`
    texto += `📦 Comandos: ${totalComandos}\n`

    for (const clave of ORDEN_CATEGORIAS) {
      const cmds = categories.get(clave)
      if (!cmds || !cmds.length) continue
      texto = construirCaja(CATEGORIAS[clave], cmds, texto)
    }

    for (const [clave, cmds] of categories) {
      if (ORDEN_CATEGORIAS.includes(clave) || !cmds.length) continue
      texto = construirCaja({ emoji: '📂', titulo: clave.toUpperCase() }, cmds, texto)
    }

    texto += `\n🌸 _${config.BOT_NAME}_`

    const medios = config.MENU_IMAGES || []
    const elegido = medios.length ? medios[Math.floor(Math.random() * medios.length)] : null

    if (elegido) {
      try {
        const buffer = fs.readFileSync(elegido.ruta)

        if (elegido.animado) {
          await sock.sendMessage(jid, { video: buffer, caption: texto, gifPlayback: true })
        } else {
          await sock.sendMessage(jid, { image: buffer, caption: texto })
        }
        return
      } catch (error) {
        console.error('[MENU] No se pudo leer el archivo de MENU_IMAGES, se envía solo texto:', error.message)
      }
    }

    await sock.sendMessage(jid, { text: texto })
  },
}