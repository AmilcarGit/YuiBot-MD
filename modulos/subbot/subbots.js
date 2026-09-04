//CÓDIGO ORIGINAL DE YUIBOT-MD
const { exec } = require('child_process')
const { esPremium, obtenerNombrePersonalizado } = require('../../lib/subbots')
const { gruposLiderados } = require('../../lib/red')

function ejecutar(comando) {
  return new Promise((resolve) => {
    exec(comando, { timeout: 15000 }, (error, stdout) => {
      resolve({ error, stdout: stdout?.trim() || '' })
    })
  })
}

function formatearDuracion(ms) {
  const totalSegundos = Math.floor(ms / 1000)
  const h = Math.floor(totalSegundos / 3600)
  const m = Math.floor((totalSegundos % 3600) / 60)
  return `${h}h ${m}m`
}

module.exports = {
  name: 'subbots',
  aliases: ['listsubbots'],
  description: 'Lista los subbots activos',
  category: 'subbot',
  ownerOnly: true,

  async execute(sock, msg, args, { config }) {
    const jid = msg.key.remoteJid

    const { error, stdout } = await ejecutar('pm2 jlist')
    if (error) {
      return sock.sendMessage(jid, { text: '❌ No se pudo consultar PM2.' }, { quoted: msg })
    }

    let procesos = []
    try {
      procesos = JSON.parse(stdout)
    } catch {
      return sock.sendMessage(jid, { text: '❌ No se pudo leer la lista de procesos.' }, { quoted: msg })
    }

    const subbots = procesos.filter((p) => p.name?.startsWith('subbot-'))

    if (subbots.length === 0) {
      return sock.sendMessage(jid, { text: `📭 No hay subbots activos.\nUsa ${config.PREFIXES[0]}code <número> para crear uno.` }, { quoted: msg })
    }

    let texto = `⛧───「 Subbots activos 」───⛧\n\n`
    for (const p of subbots) {
      const numero = p.name.replace('subbot-', '')
      const estado = p.pm2_env?.status || 'desconocido'
      const nombre = obtenerNombrePersonalizado(numero)
      const premium = esPremium(numero) ? ' ⭐' : ''
      const grupos = gruposLiderados(numero).length
      const tiempoActivo = p.pm2_env?.pm_uptime && estado === 'online'
        ? formatearDuracion(Date.now() - p.pm2_env.pm_uptime)
        : '—'

      texto += `  ❖ +${numero}${premium}${nombre ? ` (${nombre})` : ''}\n`
      texto += `     ${estado === 'online' ? '🟢' : '🔴'} ${estado} — activo: ${tiempoActivo} — lidera ${grupos} grupo(s)\n`
    }
    texto += `\n╰─➤ _${subbots.length} subbot(s) en total_ 🥀`

    await sock.sendMessage(jid, { text: texto }, { quoted: msg })
  },
}