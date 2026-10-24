//CÓDIGO ORIGINAL DE YUIBOT-MD
const { exec } = require('child_process')
const fs = require('fs')
const path = require('path')
const { nombreProcesoActual, correEnPm2 } = require('../../lib/pm2')

module.exports = {
  name: 'apagarmisubbot',
  aliases: ['delmisubbot', 'stopmysubbot'],
  description: 'Apaga y elimina tu propio subbot',
  category: 'subbot',
  subbotOwnerOnly: true,

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
    // Nombre real del proceso en PM2 (lo creó .code o ecosystem.config.cjs).
    const nombreProceso = nombreProcesoActual(`subbot-${subbotNumero}`)
    const carpetaSubbot = path.join(raiz, 'subbots', subbotNumero)

    const borrarCarpeta = () => {
      if (fs.existsSync(carpetaSubbot)) {
        fs.rmSync(carpetaSubbot, { recursive: true, force: true })
      }
    }

    setTimeout(() => {
      // Sin PM2 no hay "pm2 delete" que valga: se borra la sesión y se cierra el proceso.
      if (!correEnPm2()) {
        borrarCarpeta()
        process.exit(0)
      }

      exec(`pm2 delete ${nombreProceso} && pm2 save`, { cwd: raiz }, (error) => {
        if (error) console.error('[APAGARMISUBBOT] Error deteniendo proceso:', error.message)
        borrarCarpeta()
      })
    }, 1500)
  },
}