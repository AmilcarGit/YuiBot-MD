//CÓDIGO ORIGINAL DE YUIBOT-MD
const { exec } = require('child_process')

function ejecutar(comando) {
  return new Promise((resolve) => {
    exec(comando, { timeout: 15000 }, (error, stdout, stderr) => {
      resolve({ error, stdout: stdout?.trim() || '', stderr: stderr?.trim() || '' })
    })
  })
}

module.exports = {
  name: 'reloadsubbots',
  aliases: ['recargarsubbots', 'actualizarsubbots'],
  description: 'Reinicia todos los subbots activos para cargar los comandos nuevos',
  category: 'owner',
  ownerOnly: true,

  async execute(sock, msg, args, { config }) {
    const jid = msg.key.remoteJid
    const resultado = await ejecutar('pm2 jlist')

    if (resultado.error) {
      return sock.sendMessage(jid, { text: '❌ No se pudo consultar PM2.' }, { quoted: msg })
    }

    let procesos = []
    try {
      procesos = JSON.parse(resultado.stdout)
    } catch {
      return sock.sendMessage(jid, { text: '❌ No se pudo leer la lista de subbots.' }, { quoted: msg })
    }

    const subbots = procesos.filter((p) => p.name?.startsWith('subbot-') && p.pm2_env?.status === 'online')

    if (!subbots.length) {
      return sock.sendMessage(jid, { text: '📭 No hay subbots activos para actualizar.' }, { quoted: msg })
    }

    await sock.sendMessage(
      jid,
      { text: `♻️ Actualizando ${subbots.length} subbot(s)...\n\nLos subbots se reiniciarán brevemente para cargar los comandos nuevos.` },
      { quoted: msg }
    )

    const reinicios = await Promise.all(
      subbots.map(async (subbot) => {
        const nombre = subbot.name
        const reinicio = await ejecutar(`pm2 restart ${nombre}`)
        return { nombre, ok: !reinicio.error }
      })
    )

    const correctos = reinicios.filter((item) => item.ok)
    const fallidos = reinicios.filter((item) => !item.ok)

    let texto = `✅ Actualización de subbots completada.\n\n`
    texto += `🟢 Reiniciados: ${correctos.length}\n`
    texto += `🔴 Fallidos: ${fallidos.length}`

    if (fallidos.length) {
      texto += `\n\n❌ ${fallidos.map((item) => item.nombre).join(', ')}`
    }

    await sock.sendMessage(jid, { text: texto }, { quoted: msg })
  },
}
