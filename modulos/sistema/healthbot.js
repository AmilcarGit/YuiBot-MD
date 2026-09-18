//CÓDIGO ORIGINAL DE YUIBOT-MD
const os = require('os')
const resiliencia = require('../../lib/resiliencia')
const apiManager = require('../../lib/apiManager')

function formatearBytes(bytes) {
  const mb = bytes / (1024 * 1024)
  return `${mb.toFixed(1)} MB`
}

function formatearDuracion(segundos) {
  const dias = Math.floor(segundos / 86400)
  const horas = Math.floor((segundos % 86400) / 3600)
  const minutos = Math.floor((segundos % 3600) / 60)
  const partes = []
  if (dias) partes.push(`${dias}d`)
  if (horas) partes.push(`${horas}h`)
  partes.push(`${minutos}m`)
  return partes.join(' ')
}

module.exports = {
  name: 'healthbot',
  aliases: ['salud', 'health'],
  description: 'Muestra el estado de salud del bot (CPU, RAM, resiliencia, APIs)',
  category: 'sistema',
  ownerOnly: true,

  async execute(sock, msg) {
    const jid = msg.key.remoteJid

    const memoria = process.memoryUsage()
    const cargaSistema = os.loadavg()[0]
    const memoriaLibreSistema = os.freemem()
    const memoriaTotalSistema = os.totalmem()
    const porcentajeMemoriaSistema = Math.round((1 - memoriaLibreSistema / memoriaTotalSistema) * 100)

    const estadoResiliencia = resiliencia.obtenerEstado()
    const ahora = Date.now()
    const comandosBloqueados = Object.entries(estadoResiliencia.comandos || {})
      .filter(([, info]) => info.deshabilitadoHasta > ahora)

    const proveedores = apiManager.listar()
    const proveedoresCaidos = Object.entries(proveedores).filter(([, info]) => info.enabled === false)

    const texto = [
      '🩺 *HEALTHBOT*',
      '',
      `Uptime del proceso: *${formatearDuracion(process.uptime())}*`,
      `Node: *${process.version}*`,
      `Memoria del proceso: *${formatearBytes(memoria.rss)}* (heap: ${formatearBytes(memoria.heapUsed)}/${formatearBytes(memoria.heapTotal)})`,
      `Memoria del sistema: *${porcentajeMemoriaSistema}% usada*`,
      `Carga del sistema (1 min): *${cargaSistema.toFixed(2)}*`,
      '',
      `Circuit breaker: *${estadoResiliencia.enabled ? 'activado' : 'desactivado'}*`,
      comandosBloqueados.length
        ? `⛔ Comandos deshabilitados ahora: ${comandosBloqueados.map(([n]) => n).join(', ')}`
        : '✅ Ningún comando deshabilitado por fallos.',
      '',
      proveedoresCaidos.length
        ? `⚠️ Proveedores de API deshabilitados: ${proveedoresCaidos.map(([n]) => n).join(', ')}`
        : '✅ Todos los proveedores de API están habilitados.',
    ].join('\n')

    return sock.sendMessage(jid, { text: texto }, { quoted: msg })
  },
}