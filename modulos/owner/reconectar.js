//CÓDIGO ORIGINAL DE YUIBOT-MD
const fs = require('fs')
const path = require('path')
const { exec } = require('child_process')

module.exports = {
  name: 'reconectar',
  aliases: [],
  description: 'Elimina la sesión y reinicia el bot para vincular WhatsApp nuevamente',
  category: 'owner',
  ownerOnly: true,

  async execute(sock, msg, args, { config }) {
    const jid = msg.key.remoteJid
    const sessionPath = path.resolve('./sesion')

    await sock.sendMessage(jid, { text: '🔄 Cerrando sesión y preparando una nueva vinculación...' })

    try {
      if (fs.existsSync(sessionPath)) {
        fs.rmSync(sessionPath, { recursive: true, force: true })
      }

      const pm2Name = process.env.name || config.PM2_NAME || 'YuiBot-MD'
      setTimeout(() => {
        exec(`pm2 restart ${pm2Name}`, (error) => {
          if (error) console.error('❌ Error al reiniciar con PM2:', error.message)
        })
      }, 1000)
    } catch (error) {
      console.error('❌ Error al renovar la sesión:', error)
      await sock.sendMessage(jid, { text: '❌ No se pudo eliminar la sesión actual.' })
    }
  },
}
