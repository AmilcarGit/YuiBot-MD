// Menú Premium Full - YuiBot-MD
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

const FRASES = [
  '✨ ¡Hoy es un gran día para usar el bot!',
  '🚀 Listo para ayudarte en lo que necesites',
  '💫 Que tengas un excelente día',
  '🌸 Disfruta de todas las funciones',
  '⚡ Potencia máxima activada',
  '🔥 El mejor bot a tu servicio',
  '💎 Calidad premium para ti',
  '🌟 Brilla con cada comando',
  '🎯 Todo listo para ti',
  '🌈 Que tu día sea increíble',
  '🦋 Siente la magia de YuiBot',
  '☁️ Relájate y usa el bot',
  '🎁 Un regalo de funciones para ti',
  '🪐 Explora todo lo que puedo hacer',
  '💖 Hecho con cariño para ti',
  '🧨 Energía al máximo',
  '🌺 Florece con cada comando',
  '🪐 El universo de comandos te espera',
  '🧿 Protección y estilo activados',
  '🪞 Refleja tu mejor versión'
]

function obtenerHoraPeru() {
  const ahora = new Date()
  const hora = ahora.toLocaleTimeString('es-PE', {
    timeZone: 'America/Lima',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true
  })
  const fecha = ahora.toLocaleDateString('es-PE', {
    timeZone: 'America/Lima',
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
  return {
    hora,
    fecha: fecha.charAt(0).toUpperCase() + fecha.slice(1)
  }
}

function obtenerSaludo() {
  const h = parseInt(new Date().toLocaleString('en-US', {
    timeZone: 'America/Lima',
    hour: 'numeric',
    hour12: false
  }))
  if (h >= 5 && h < 12) return '☀️ 𝗕𝘂𝗲𝗻𝗼𝘀 𝗱í𝗮𝘀'
  if (h >= 12 && h < 19) return '🌤️ 𝗕𝘂𝗲𝗻𝗮𝘀 𝘁𝗮𝗿𝗱𝗲𝘀'
  return '🌙 𝗕𝘂𝗲𝗻𝗮𝘀 𝗻𝗼𝗰𝗵𝗲𝘀'
}

function obtenerUptime() {
  const segundos = process.uptime()
  const d = Math.floor(segundos / 86400)
  const h = Math.floor((segundos % 86400) / 3600)
  const m = Math.floor((segundos % 3600) / 60)
  const s = Math.floor(segundos % 60)

  let texto = ''
  if (d > 0) texto += d + '𝗱 '
  if (h > 0) texto += h + '𝗵 '
  if (m > 0) texto += m + '𝗺 '
  texto += s + '𝘀'
  return texto.trim()
}

function construirCategoria(info, comandos) {
  const unicos = [...new Set(comandos)]
  let texto = '\n╭─❖ 「 ' + info.emoji + ' ' + info.titulo + ' 」 ❖─╮\n'
  texto += '│  📌 *' + unicos.length + ' comandos*\n'
  texto += '├────────────────────\n'

  unicos.forEach((cmd, i) => {
    const esUltimo = i === unicos.length - 1
    const rama = esUltimo ? '╰' : '│'
    texto += rama + '  ✧ *' + cmd.name + '*\n'
    if (cmd.description) {
      texto += (esUltimo ? ' ' : '│') + '     _' + cmd.description + '_\n'
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
    const prefijo = (config.PREFIXES && config.PREFIXES[0]) || '.'

    const { hora, fecha } = obtenerHoraPeru()
    const saludo = obtenerSaludo()
    const uptime = obtenerUptime()
    const frase = FRASES[Math.floor(Math.random() * FRASES.length)]

    // ========== HEADER ==========
    let texto = '╭━━━━━━━━━━━━━━━━━━━━━━━━╮\n'
    texto += '┃     🌸 *𝗬𝘂𝗶𝗕𝗼𝘁-𝗠𝗗* 🌸     ┃\n'
    texto += '╰━━━━━━━━━━━━━━━━━━━━━━━━╯\n\n'

    texto += saludo + ', *' + nombreUsuario + '* ✨\n'
    texto += '˚₊· ͟͟͞͞➳ ' + frase + '\n\n'

    texto += '╭─❖ 「 📌 𝗜𝗡𝗙𝗢𝗥𝗠𝗔𝗖𝗜𝗢́𝗡 」 ❖─╮\n'
    texto += '│ 🤖 𝗧𝗶𝗽𝗼 » ' + tipoBot + '\n'
    texto += '│ 👤 𝗨𝘀𝘂𝗮𝗿𝗶𝗼 » *' + nombreUsuario + '*\n'
    texto += '│ ⚡ 𝗣𝗿𝗲𝗳𝗶𝗷𝗼 » *' + prefijo + '*\n'
    texto += '│ 📦 𝗖𝗼𝗺𝗮𝗻𝗱𝗼𝘀 » *' + totalComandos + '*\n'
    texto += '│ ⏱️ 𝗨𝗽𝘁𝗶𝗺𝗲 » *' + uptime + '*\n'
    texto += '│ 🕐 𝗛𝗼𝗿𝗮 𝗣𝗲𝗿ú » *' + hora + '*\n'
    texto += '│ 📅 𝗙𝗲𝗰𝗵𝗮 » *' + fecha + '*\n'
    texto += '╰────────────────────────╯\n'

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
    texto += '\n╭━━━━━━━━━━━━━━━━━━━━━━━━╮\n'
    texto += '│  🌸 *' + (config.BOT_NAME || 'YuiBot-MD') + '*\n'
    texto += '│  💡 Usa *' + prefijo + 'comando*\n'
    texto += '│  ❤️ Hecho con mucho cariño\n'
    texto += '╰━━━━━━━━━━━━━━━━━━━━━━━━╯'

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