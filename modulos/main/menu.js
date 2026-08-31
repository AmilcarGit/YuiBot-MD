//CÓDIGO ORIGINAL DE YUIBOT-MD
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

    const imagenes = config.MENU_IMAGES || []
    if (imagenes.length === 0) {
      return sock.sendMessage(jid, { text })
    }

    const urlElegida = imagenes[Math.floor(Math.random() * imagenes.length)]
    const esGif = urlElegida.toLowerCase().endsWith('.gif')

    try {
      const respuesta = await fetch(urlElegida)
      if (!respuesta.ok) throw new Error(`HTTP ${respuesta.status}`)
      const buffer = Buffer.from(await respuesta.arrayBuffer())

      if (esGif) {
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
      console.error('[MENU] No se pudo enviar la imagen, se envía solo texto:', error)
      await sock.sendMessage(jid, { text })
    }
  },
}