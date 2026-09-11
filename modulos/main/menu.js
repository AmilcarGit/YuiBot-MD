//CÓDIGO MEJORADO - Menú Minimalista Premium
const fs = require('fs')

const ORDEN_CATEGORIAS = ['main', 'usuario', 'grupo', 'download', 'media', 'diversion', 'utilidad', 'subbot', 'owner']

const CATEGORIAS = {
  main: { emoji: '🌸', titulo: 'PRINCIPAL' },
  usuario: { emoji: '👤', titulo: 'USUARIO' },
  grupo: { emoji: '👥', titulo: 'GRUPO' },
  download: { emoji: '📥', titulo: 'DESCARGAS' },
  media: { emoji: '🎨', titulo: 'MULTIMEDIA' },
  diversion: { emoji: '🎮', titulo: 'DIVERSIÓN' },
  utilidad: { emoji: '🛠️', titulo: 'UTILIDADES' },
  subbot: { emoji: '🔗', titulo: 'SUBBOT' },
  owner: { emoji: '👑', titulo: 'OWNER' },
}

function construirCategoria(info, comandos) {
  const unicos = [...new Set(comandos)]
  let texto = `\n┌─ \( {info.emoji} * \){info.titulo}*\n`

  unicos.forEach((cmd, i) => {
    const esUltimo = i === unicos.length - 1
    const simbolo = esUltimo ? '└' : '│'
    texto += `\( {simbolo}  • * \){cmd.name}*\n`
    if (cmd.description) {
      texto += `\( {esUltimo ? ' ' : '│'}    _ \){cmd.description}_\n`
    }
  })

  return texto
}

module.exports = {
  name: 'menu',
  aliases: ['ayuda', 'help'],
  description: 'Muestra la lista de comandos disponibles',
  category: 'main',

  async execute(sock, msg, args, { categories, commands, config, esSubBot }) {
    const jid = msg.key.remoteJid
    const nombreUsuario = msg.pushName || 'Usuario'
    const totalComandos = [...new Set(commands.values())].length
    const tipoBot = esSubBot ? '🔗 SubBot' : '🌸 Bot Principal'
    const prefijo = config.PREFIXES?.[0] || '.'

    let texto = `🌸 ═══ *YuiBot-MD* ═══ 🌸\n\n`
    texto += `✦ *Tipo:* ${tipoBot}\n`
    texto += `✦ *Usuario:* ${nombreUsuario}\n`
    texto += `✦ *Prefijo:* ${prefijo}\n`
    texto += `✦ *Comandos:* ${totalComandos}\n`
    texto += `────────────────────`

    // Categorías en orden
    for (const clave of ORDEN_CATEGORIAS) {
      const cmds = categories.get(clave)
      if (!cmds || !cmds.length) continue
      texto += construirCategoria(CATEGORIAS[clave], cmds)
    }

    // Categorías que no estén en el orden predefinido
    for (const [clave, cmds] of categories) {
      if (ORDEN_CATEGORIAS.includes(clave) || !cmds.length) continue
      texto += construirCategoria({ emoji: '📂', titulo: clave.toUpperCase() }, cmds)
    }

    texto += `\n🌸 _${config.BOT_NAME || 'YuiBot-MD'}_`
    texto += `\n💡 Usa *${prefijo}comando* para ejecutarlo`

    // Enviar con imagen/gif si existe
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
        console.error('[MENU] Error al cargar imagen:', error.message)
      }
    }

    await sock.sendMessage(jid, { text: texto })
  },
}