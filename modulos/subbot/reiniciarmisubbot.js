//CÓDIGO ORIGINAL DE YUIBOT-MD
const { exec } = require('child_process')

module.exports = {
  name: 'reiniciarmisubbot',
  aliases: ['restartmysubbot'],
  description: 'Reinicia tu propio subbot',
  category: 'subbot',
  ownerOnly: true,

  async execute(sock, msg, args, { esSubBot, subbotNumero }) {
    const jid = msg.key.remoteJid

    if (!esSubBot) {
      return sock.sendMessage(jid, { text: '❌ Este comando solo funciona ejecutado desde un subbot.' }, { quoted: msg })
    }

    await sock.sendMessage(jid, { text: '♻️ Reiniciando tu subbot, vuelve a estar disponible en unos segundos...' }, { quoted: msg })

    setTimeout(() => {
      exec(`pm2 restart subbot-${subbotNumero}`, (error) => {
        if (error) console.error('[REINICIARMISUBBOT] Error:', error.message)
      })
    }, 1500)
  },
}