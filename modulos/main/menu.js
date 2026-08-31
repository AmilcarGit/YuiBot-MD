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

    await sock.sendMessage(jid, { text: text.trim() })
  },
}