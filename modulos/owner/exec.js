//CÓDIGO ORIGINAL DE YUIBOT-MD
const { exec } = require('child_process')
const path = require('path')

module.exports = {
  name: 'exec',
  description: 'Ejecuta un comando del sistema como owner',
  category: 'owner',
  ownerOnly: true,

  async execute(sock, msg, args) {
    const jid = msg.key.remoteJid
    const comando = args.join(' ').trim()
    if (!comando) {
      return sock.sendMessage(jid, { text: '💻 Usa: *exec comando*' }, { quoted: msg })
    }

    const raiz = path.join(__dirname, '..', '..')
    await sock.sendMessage(jid, { text: '⏳ Ejecutando comando del sistema...' }, { quoted: msg })

    exec(comando, { cwd: raiz, timeout: 30000, maxBuffer: 1024 * 1024 }, async (error, stdout, stderr) => {
      const salida = [stdout?.trim(), stderr?.trim()].filter(Boolean).join('\n') || (error ? error.message : 'Comando completado sin salida')
      const estado = error ? '❌' : '✅'
      await sock.sendMessage(jid, {
        text: `${estado} *EXEC*\n\n\`\`\`\n${salida.slice(0, 12000)}\n\`\`\``
      }, { quoted: msg }).catch(() => {})
    })
  },
}
