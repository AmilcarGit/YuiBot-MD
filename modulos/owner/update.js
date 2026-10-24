//CÓDIGO ORIGINAL DE YUIBOT-MD
const { exec } = require('child_process')
const path = require('path')
const { nombreProcesoActual, correEnPm2 } = require('../../lib/pm2')

function ejecutar(comando, cwd) {
  return new Promise((resolve) => {
    exec(comando, { cwd, timeout: 60000 }, (error, stdout, stderr) => {
      resolve({ error, stdout: stdout?.trim() || '', stderr: stderr?.trim() || '' })
    })
  })
}

module.exports = {
  name: 'update',
  aliases: ['actualizar', 'pull'],
  description: 'Hace git pull del repositorio y reinicia el bot si hay cambios',
  category: 'owner',
  ownerOnly: true,

  async execute(sock, msg, args, { config }) {
    const jid = msg.key.remoteJid
    const raiz = path.join(__dirname, '..', '..')

    await sock.sendMessage(jid, { text: '⏳ Ejecutando git pull...' }, { quoted: msg })

    const resultado = await ejecutar('git pull', raiz)

    if (resultado.error) {
      return sock.sendMessage(
        jid,
        {
          text:
            `❌ git pull falló.\n\n` +
            '```' + (resultado.stderr || resultado.error.message) + '```'
        },
        { quoted: msg }
      )
    }

    const salida = resultado.stdout || resultado.stderr || 'Sin salida'
    const yaActualizado = /already up to date/i.test(salida)

    let texto = `📦 git pull completado:\n\n` + '```' + salida + '```'

    if (yaActualizado) {
      texto += '\n\n✅ No había cambios nuevos.'
      return sock.sendMessage(jid, { text: texto }, { quoted: msg })
    }

    // Si el pull tocó las dependencias, el reinicio solo no basta: hay que instalar.
    if (/package(-lock)?\.json/.test(salida)) {
      texto += '\n\n📦 Cambiaron las dependencias (package.json). Ejecuta *npm install* en el servidor antes de reiniciar.'
    }

    // Sin PM2 (ej. `npm start` en Termux) no hay quien reinicie el proceso.
    if (!correEnPm2()) {
      texto += '\n\n⚠️ Hay cambios nuevos. Este bot no corre bajo PM2: reinícialo manualmente (npm start).'
      return sock.sendMessage(jid, { text: texto }, { quoted: msg })
    }

    // Nombre real del proceso en PM2 (puede diferir de config.PM2_PROCESS_NAME).
    const nombreProceso = nombreProcesoActual(config.PM2_PROCESS_NAME)
    if (!nombreProceso) {
      texto += '\n\n⚠️ Hay cambios nuevos. Reinicia manualmente con `pm2 restart <nombre>`.'
      return sock.sendMessage(jid, { text: texto }, { quoted: msg })
    }

    await sock.sendMessage(
      jid,
      { text: texto + `\n\n♻️ Reiniciando ${config.BOT_NAME}...` },
      { quoted: msg }
    )

    exec(`pm2 restart ${nombreProceso}`, { cwd: raiz }, (error) => {
      if (error) {
        console.error('[UPDATE] Error al reiniciar con PM2:', error)
      }
    })
  },
}