//CÓDIGO ORIGINAL DE YUIBOT-MD
const { exec } = require('child_process')
const fs = require('fs')
const path = require('path')

function ejecutar(comando, cwd) {
  return new Promise((resolve) => {
    exec(comando, { cwd, timeout: 15000 }, (error, stdout, stderr) => {
      resolve({ error, stdout: stdout?.trim() || '', stderr: stderr?.trim() || '' })
    })
  })
}

module.exports = {
  name: 'delsubbot',
  aliases: ['removesubbot'],
  description: 'Elimina un subbot y su sesión',
  category: 'subbot',
  ownerOnly: true,

  async execute(sock, msg, args, { config }) {
    const jid = msg.key.remoteJid
    const prefijo = config.PREFIXES[0]
    const numero = (args[0] || '').replace(/\D/g, '')

    if (!numero) {
      return sock.sendMessage(jid, { text: `❌ Escribe el número del subbot a eliminar.\n📌 Ejemplo: ${prefijo}delsubbot 5218112345678` }, { quoted: msg })
    }

    const raiz = path.join(__dirname, '..', '..')
    const nombreProceso = `subbot-${numero}`
    const carpetaSubbot = path.join(raiz, 'subbots', numero)

    await ejecutar(`pm2 delete ${nombreProceso}`, raiz)
    await ejecutar('pm2 save', raiz)

    if (fs.existsSync(carpetaSubbot)) {
      fs.rmSync(carpetaSubbot, { recursive: true, force: true })
    }

    await sock.sendMessage(jid, { text: `✅ Subbot +${numero} eliminado (proceso detenido y sesión borrada).` }, { quoted: msg })
  },
}