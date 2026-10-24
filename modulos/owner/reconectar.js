//CÓDIGO ORIGINAL DE YUIBOT-MD
const fs = require('fs')
const path = require('path')
const { exec } = require('child_process')
const { nombreProcesoActual, correEnPm2 } = require('../../lib/pm2')

module.exports = {
  name: 'reconectar',
  aliases: [],
  description: 'Elimina la sesión y reinicia el bot para vincular WhatsApp nuevamente',
  category: 'owner',
  ownerOnly: true,

  async execute(sock, msg, args, { config, esSubBot } = {}) {
    const jid = msg.key.remoteJid

    // Este comando borra la sesión del BOT PRINCIPAL; ejecutado desde un subbot
    // borraría la sesión equivocada. Para un subbot existe .delsubbot / .apagarmisubbot.
    if (esSubBot) {
      return sock.sendMessage(jid, { text: '⛔ reconectar solo se usa en el bot principal. Para un subbot usa delsubbot o apagarmisubbot.' }, { quoted: msg })
    }

    // La carpeta real de sesión del bot principal es "session" (ver main.js).
    // Antes apuntaba a "./sesion" (que no existe) y a una ruta relativa al cwd.
    const sessionPath = path.join(__dirname, '..', '..', 'session')

    await sock.sendMessage(jid, { text: '🔄 Cerrando sesión y preparando una nueva vinculación...' })

    try {
      if (fs.existsSync(sessionPath)) {
        fs.rmSync(sessionPath, { recursive: true, force: true })
      }
    } catch (error) {
      console.error('❌ Error al renovar la sesión:', error)
      return sock.sendMessage(jid, { text: '❌ No se pudo eliminar la sesión actual.' })
    }

    // Bajo PM2: reinicio con el nombre real del proceso (config usa PM2_PROCESS_NAME;
    // antes se leía config.PM2_NAME, que no existe).
    if (correEnPm2()) {
      const pm2Name = nombreProcesoActual(config.PM2_PROCESS_NAME || 'YuiBot-MD')
      setTimeout(() => {
        exec(`pm2 restart ${pm2Name}`, (error) => {
          if (error) console.error('❌ Error al reiniciar con PM2:', error.message)
        })
      }, 1000)
      return
    }

    // Sin PM2 (por ejemplo `npm start` en Termux) nadie reinicia el proceso: se cierra
    // para que no quede corriendo sin credenciales. Hay que volver a iniciarlo a mano.
    await sock.sendMessage(jid, { text: '✅ Sesión eliminada. El bot se cerrará; inicia de nuevo con *npm start* para vincular otra vez.' })
    setTimeout(() => process.exit(0), 1500)
  },
}
