//CÓDIGO ORIGINAL DE YUIBOT-MD
const os = require('os')
const { listarSubbots } = require('../../lib/subbots')
const { gruposLiderados } = require('../../lib/red')

function formatearDuracion(segundos) {
  const d = Math.floor(segundos / 86400)
  const h = Math.floor((segundos % 86400) / 3600)
  const m = Math.floor((segundos % 3600) / 60)
  const s = Math.floor(segundos % 60)
  const partes = []
  if (d > 0) partes.push(`${d}d`)
  if (h > 0) partes.push(`${h}h`)
  if (m > 0) partes.push(`${m}m`)
  partes.push(`${s}s`)
  return partes.join(' ')
}

function formatearBytes(bytes) {
  const mb = bytes / (1024 * 1024)
  if (mb >= 1024) return `${(mb / 1024).toFixed(2)} GB`
  return `${mb.toFixed(1)} MB`
}

module.exports = {
  name: 'infobot',
  aliases: ['botinfo', 'stats', 'estadisticas'],
  description: 'Muestra información y estadísticas del bot en tiempo real',
  category: 'main',

  async execute(sock, msg, args, { config, commands, categories, esSubBot, subbotNumero }) {
    const jid = msg.key.remoteJid

    const totalComandos = [...new Set(commands.values())].length
    const totalCategorias = [...categories.keys()].length

    const memProceso = process.memoryUsage()
    const memUsadaSistema = os.totalmem() - os.freemem()
    const porcentajeRam = ((memUsadaSistema / os.totalmem()) * 100).toFixed(1)

    const cargaCpu = os.loadavg()[0]?.toFixed(2) ?? 'N/D'
    const nucleos = os.cpus().length

    const tipoInstancia = esSubBot ? `🔗 Subbot (+${subbotNumero})` : '🌸 Principal'

    let texto = `⛧───「 ${config.BOT_NAME} — Info 」───⛧\n\n`

    texto += `📌 *General*\n`
    texto += `  ❖ tipo: ${tipoInstancia}\n`
    texto += `  ❖ versión: ${config.BOT_VERSION}\n`
    texto += `  ❖ prefijos: ${config.PREFIXES.join(' ')}${config.ALLOW_NO_PREFIX ? ' (o sin prefijo)' : ''}\n`
    texto += `  ❖ comandos: ${totalComandos}\n`
    texto += `  ❖ categorías: ${totalCategorias}\n\n`

    texto += `⏱️ *Actividad*\n`
    texto += `  ❖ tiempo activo: ${formatearDuracion(process.uptime())}\n`
    texto += `  ❖ hora del servidor: ${new Date().toLocaleString('es-PE')}\n\n`

    texto += `💻 *Sistema*\n`
    texto += `  ❖ plataforma: ${os.platform()} (${os.arch()})\n`
    texto += `  ❖ node: ${process.version}\n`
    texto += `  ❖ núcleos CPU: ${nucleos}\n`
    texto += `  ❖ carga CPU (1 min): ${cargaCpu}\n\n`

    texto += `🧠 *Memoria*\n`
    texto += `  ❖ usada por el bot: ${formatearBytes(memProceso.rss)}\n`
    texto += `  ❖ heap usado: ${formatearBytes(memProceso.heapUsed)} / ${formatearBytes(memProceso.heapTotal)}\n`
    texto += `  ❖ RAM del servidor: ${formatearBytes(memUsadaSistema)} / ${formatearBytes(os.totalmem())} (${porcentajeRam}%)\n\n`

    texto += `👑 *Owners*\n`
    for (const o of config.OWNERS) {
      texto += `  ❖ ${o.nombre} (${o.rango}) — +${o.numero}\n`
    }

    if (!esSubBot) {
      const subbots = listarSubbots()
      const gruposActivos = subbots.reduce((acc, numero) => acc + gruposLiderados(numero).length, 0)

      texto += `\n🔗 *Subbots*\n`
      texto += `  ❖ registrados: ${subbots.length}\n`
      texto += `  ❖ grupos liderados en total: ${gruposActivos}\n`
    }

    texto += `\n╰─➤ _${config.BOT_NAME}_ 🥀`

    await sock.sendMessage(jid, { text: texto }, { quoted: msg })
  },
}