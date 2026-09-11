// Menú Premium - YuiBot-MD (Diseño mejorado)
const fs = require('fs')

const ORDEN_CATEGORIAS = ['main', 'usuario', 'grupo', 'download', 'media', 'diversion', 'utilidad', 'subbot', 'owner']

const CATEGORIAS = {
  main:      { emoji: '🌸', titulo: '𝗣𝗥𝗜𝗡𝗖𝗜𝗣𝗔𝗟' },
  usuario:   { emoji: '👤', titulo: '𝗨𝗦𝗨𝗔𝗥𝗜𝗢' },
  grupo:     { emoji: '👥', titulo: '𝗚𝗥𝗨𝗣𝗢' },
  download:  { emoji: '📥', titulo: '𝗗𝗘𝗦𝗖𝗔𝗥𝗚𝗔𝗦' },
  media:     { emoji: '🎨', titulo: '𝗠𝗨𝗟𝗧𝗜𝗠𝗘𝗗𝗜𝗔' },
  diversion: { emoji: '🎮', titulo: '𝗗𝗜𝗩𝗘𝗥𝗦𝗜𝗢𝗡' },
  utilidad:  { emoji: '🛠️', titulo: '𝗨𝗧𝗜𝗟𝗜𝗗𝗔𝗗𝗘𝗦' },
  subbot:    { emoji: '🔗', titulo: '𝗦𝗨𝗕𝗕𝗢𝗧' },
  owner:     { emoji: '👑', titulo: '𝗢𝗪𝗡𝗘𝗥' },
}

function obtenerHoraPeru() {
  const ahora = new Date()
  const opciones = {
    timeZone: 'America/Lima',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true
  }
  const fechaOpciones = {
    timeZone: 'America/Lima',
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  }

  const hora = ahora.toLocaleTimeString('es-PE', opciones)
  const fecha = ahora.toLocaleDateString('es-PE', fechaOpciones)

  // Capitalizar primera letra del día
  const fechaBonita = fecha.charAt(0).toUpperCase() + fecha.slice(1)

  return { hora, fecha: fechaBonita }
}

function obtenerSaludo() {
  const hora = new Date().toLocaleString('en-US', {
    timeZone: 'America/Lima',
    hour: 'numeric',
    hour12: false
  })
  const h = parseInt(hora)

  if (h >= 5 && h < 12) return '☀️ Buenos días'
  if (h >= 12 && h < 19) return '🌤️ Buenas tardes'
  return '🌙 Buenas noches'
}

function construirCategoria(info, comandos) {
  const unicos = [...new Set(comandos)]
  let texto = `\n╭─「 ${info.emoji} ${info.titulo} 」\n`

  unicos.forEach((cmd, i) => {
    const esUltimo = i === unicos.length - 1
    const rama = esUltimo ? '╰' : '│'
    texto += `\( {rama}  ❯ * \){cmd.name}*\n`
    if (cmd.description) {
      texto += `\( {esUltimo ? ' ' : '│'}     _ \){cmd.description}_\n`
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
    const tipoBot = esSubBot ? '🔗 𝗦𝘂𝗯𝗕𝗼𝘁' : '🌸 𝗕𝗼𝘁 𝗣𝗿𝗶𝗻𝗰𝗶𝗽𝗮𝗹'
    const prefijo = config.PREFIXES?.[0] || '.'

    const { hora, fecha } = obtenerHoraPeru()
    const saludo = obtenerSaludo()

    // ========== HEADER ==========
    let texto = `╭━━━━━━━━━━━━━━━━━━━━╮\n`
    texto += `┃  🌸 *𝗬𝘂𝗶𝗕𝗼𝘁-𝗠𝗗* 🌸  ┃\n`
    texto += `╰━━━━━━━━━━━━━━━━━━━━╯\n\n`

    texto += `\( {saludo}, * \){nombreUsuario}* ✨\n\n`

    texto += `╭─「 📌 𝗜𝗡𝗙𝗢𝗥𝗠𝗔𝗖𝗜𝗢́𝗡 」\n`
    texto += `│ 🤖 Tipo: ${tipoBot}\n`
    texto += `│ 👤 Usuario: *${nombreUsuario}*\n`
    texto += `│ ⚡ Prefijo: *${prefijo}*\n`
    texto += `│ 📦 Comandos: *${totalComandos}*\n`
    texto += `│ 🕐 Hora Perú: *${hora}*\n`
    texto += `│ 📅 Fecha: *${fecha}*\n`
    texto += `╰────────────────────\n`

    // ========== CATEGORÍAS ==========
    for (const clave of ORDEN_CATEGORIAS) {
      const cmds = categories.get(clave)
      if (!cmds || !cmds.length) continue
      texto += construirCategoria(CATEGORIAS[clave], cmds)
    }

    // Categorías extras
    for (const [clave, cmds] of categories) {
      if (ORDEN_CATEGORIAS.includes(clave) || !cmds.length) continue
      texto += construirCategoria({ emoji: '📂', titulo: clave.toUpperCase() }, cmds)
    }

    // ========== FOOTER ==========
    texto += `\n╭────────────────────╮\n`
    texto += `│ 🌸 *${config.BOT_NAME || 'YuiBot-MD'}*\n`
    texto += `│ 💡 Usa *${prefijo}comando*\n`
    texto += `╰────────────────────╯`

    // Enviar con imagen/gif si existe
    const medios = config.MENU_IMAGES || []
    const elegido = medios.length ? medios[Math.floor(Math.random() * medios.length)] : null

    if (elegido) {
      try {
        const buffer = fs.readFileSync(elegido.ruta)

        if (elegido.animado) {
          await sock.sendMessage(jid, {
            video: buffer,
            caption: texto,
            gifPlayback: true
          })
        } else {
          await sock.sendMessage(jid, {
            image: buffer,
            caption: texto
          })
        }
        return
      } catch (error) {
        console.error('[MENU] Error al cargar imagen:', error.message)
      }
    }

    await sock.sendMessage(jid, { text: texto })
  },
}