//CÓDIGO ORIGINAL DE YUIBOT-MD
const { exec } = require('child_process')
const { nombreProcesoActual, correEnPm2 } = require('../../lib/pm2')

module.exports = {
  name: 'reiniciarmisubbot',
  aliases: ['restartmysubbot'],
  description: 'Reinicia tu propio subbot',
  category: 'subbot',
  subbotOwnerOnly: true,

  async execute(sock, msg, args, { esSubBot, subbotNumero }) {
    const jid = msg.key.remoteJid

    if (!esSubBot) {
      return sock.sendMessage(jid, { text: '❌ Este comando solo funciona ejecutado desde un subbot.' }, { quoted: msg })
    }

    if (!correEnPm2()) {
      return sock.sendMessage(jid, { text: '⚠️ Este subbot no está corriendo bajo PM2, así que no puedo reiniciarlo desde aquí. Reinícialo manualmente.' }, { quoted: msg })
    }

    await sock.sendMessage(jid, { text: '♻️ Reiniciando tu subbot, vuelve a estar disponible en unos segundos...' }, { quoted: msg })

    // Nombre real del proceso en PM2 (funciona igual si lo creó .code o ecosystem.config.cjs).
    const nombreProceso = nombreProcesoActual(`subbot-${subbotNumero}`)

    setTimeout(() => {
      exec(`pm2 restart ${nombreProceso}`, (error) => {
        if (error) console.error('[REINICIARMISUBBOT] Error:', error.message)
      })
    }, 1500)
  },
}