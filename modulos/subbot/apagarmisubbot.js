//CÓDIGO ORIGINAL DE YUIBOT-MD
const { exec } = require('child_process')
const fs = require('fs')
const path = require('path')

module.exports = {
  name: 'apagarmisubbot',
  aliases: ['delmisubbot', 'stopmysubbot'],
  description: 'Apaga y elimina tu propio subbot',
  category: 'subbot',
  ownerOnly: true,

  async execute(sock, msg, args, { esSubBot, subbotNumero }) {
    const jid = msg.key.remoteJid

    if (!esSubBot) {
      return sock.sendMessage(jid, { text: '❌ Este comando solo funciona ejecutado desde un subbot.' }, { quoted: msg })
    }

    if ((args[0] || '').toLowerCase() !== 'confirmar') {
      return sock.sendMessage(
        jid,
        { text: `⚠️ Esto va a apagar y eliminar tu subbot permanentemente (tendrás que volver a vincularlo con un código nuevo).\n\nSi estás seguro, escribe:\n*.apagarmisubbot confirmar*` },
        { quoted: msg }
      )
    }

    await sock.sendMessage(jid, { text: '👋 Apagando y eliminando este subbot...' }, { quoted: msg })

    const raiz = path.join(__dirname, '..', '..')
    const nombreProceso = `subbot-${subbotNumero}`
    const carpetaSubbot = path.join(raiz, 'subbots', subbotNumero)

    setTimeout(() => {
      exec(`pm2 delete ${nombreProceso} && pm2 save`, { cwd: raiz }, (error) => {
        if (error) console.error('[APAGARMISUBBOT] Error deteniendo proceso:', error.message)
        if (fs.existsSync(carpetaSubbot)) {
          fs.rmSync(carpetaSubbot, { recursive: true, force: true })
        }
      })
    }, 1500)
  },
}