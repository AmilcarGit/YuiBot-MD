//CÓDIGO ORIGINAL DE YUIBOT-MD
const { exec } = require('child_process')
const path = require('path')

module.exports = {
  name: 'exec',
  description: 'Ejecuta un comando del sistema como owner',
  category: 'owner',
  ownerOnly: true,

  async execute(sock, msg, args, { esSubBot } = {}) {
    const jid = msg.key.remoteJid

    // Defensa en profundidad: comandos de sistema solo desde el bot
    // principal, nunca dentro de un subbot (aunque quien lo pida sea owner).
    if (esSubBot) {
      return sock.sendMessage(jid, { text: '⛔ exec solo está disponible en el bot principal.' }, { quoted: msg })
    }

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
