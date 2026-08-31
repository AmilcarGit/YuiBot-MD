//CÓDIGO ORIGINAL DE YUIBOT-MD
const fs = require('fs')

const EMOJIS_CATEGORIA = {
  main: '🏠',
  download: '📥',
  owner: '👑',
}

module.exports = {
  name: 'menu',
  aliases: ['ayuda', 'help'],
  description: 'Muestra la lista de comandos disponibles',
  category: 'main',

  async execute(sock, msg, args, { categories, config }) {
    const jid = msg.key.remoteJid
    const totalComandos = [...categories.values()].reduce((acc, cmds) => acc + new Set(cmds).size, 0)

    let text = `⛧───「 ${config.BOT_NAME} 」───⛧\n`
    text += `_${totalComandos} comando(s) disponibles_\n\n`

    for (const [category, cmds] of categories) {
      const emoji = EMOJIS_CATEGORIA[category] || '📂'
      text += `${emoji} ${category.toUpperCase()}\n`
      const unique = [...new Set(cmds)]
      for (const cmd of unique) {
        text += `  ❖ ${cmd.name}     → ${cmd.description}\n`
      }
      text += '\n'
    }
    text += `╰─➤ _Prefijos: ${config.PREFIXES.join(' ')}${config.ALLOW_NO_PREFIX ? ' (o sin prefijo)' : ''}_ 🥀`

    text = text.trim()

    const imagenes = (config.MENU_IMAGES || []).filter((img) => fs.existsSync(img.ruta))
    if (imagenes.length === 0) {
      return sock.sendMessage(jid, { text })
    }

    const elegida = imagenes[Math.floor(Math.random() * imagenes.length)]

    try {
      const buffer = fs.readFileSync(elegida.ruta)

      if (elegida.animado) {
        await sock.sendMessage(jid, {
          video: buffer,
          gifPlayback: true,
          caption: text,
        })
      } else {
        await sock.sendMessage(jid, {
          image: buffer,
          caption: text,
        })
      }
    } catch (error) {
      console.error('[MENU] No se pudo leer la imagen local, se envía solo texto:', error)
      await sock.sendMessage(jid, { text })
    }
  },
}