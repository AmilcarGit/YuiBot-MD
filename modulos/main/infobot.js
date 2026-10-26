//CÓDIGO ORIGINAL DE YUIBOT-MD
const os = require('os')
const { listarSubbots } = require('../../lib/subbots')
const { gruposLiderados } = require('../../lib/red')
const { caja } = require('../../lib/estilo')

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

    const filas = [
      ['Tipo', tipoInstancia],
      ['Versión', config.BOT_VERSION],
      ['Prefijos', `${config.PREFIXES.join(' ')}${config.ALLOW_NO_PREFIX ? ' (o sin prefijo)' : ''}`],
      ['Comandos', totalComandos],
      ['Categorías', totalCategorias],
      '┃',
      ['Activo', formatearDuracion(process.uptime()), '⏱️'],
      ['Hora', new Date().toLocaleString('es-PE'), '🕒'],
      '┃',
      ['Plataforma', `${os.platform()} (${os.arch()})`, '💻'],
      ['Node', process.version, '💻'],
      ['Núcleos CPU', nucleos, '💻'],
      ['Carga CPU', cargaCpu, '💻'],
      '┃',
      ['RAM bot', formatearBytes(memProceso.rss), '🧠'],
      ['Heap', `${formatearBytes(memProceso.heapUsed)} / ${formatearBytes(memProceso.heapTotal)}`, '🧠'],
      ['RAM servidor', `${formatearBytes(memUsadaSistema)} / ${formatearBytes(os.totalmem())} (${porcentajeRam}%)`, '🧠'],
      '┃',
      ...config.OWNERS.map((o) => ['Owner', `${o.nombre} (${o.rango}) — +${o.numero}`, '👑']),
    ]

    if (!esSubBot) {
      const subbots = listarSubbots()
      const gruposActivos = subbots.reduce((acc, numero) => acc + gruposLiderados(numero).length, 0)
      filas.push('┃', ['Subbots', subbots.length, '🔗'], ['Grupos liderados', gruposActivos, '🔗'])
    }

    const texto = caja('🤖', `${config.BOT_NAME} Info`, filas, config.BOT_NAME)

    await sock.sendMessage(jid, { text: texto }, { quoted: msg })
  },
}