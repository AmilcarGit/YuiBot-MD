//CÓDIGO ORIGINAL DE YUIBOT-MD
const { exec } = require('child_process')
const fs = require('fs')
const path = require('path')

function ejecutar(comando, cwd) {
  return new Promise((resolve) => {
    exec(comando, { cwd, timeout: 30000 }, (error, stdout, stderr) => {
      resolve({ error, stdout: stdout?.trim() || '', stderr: stderr?.trim() || '' })
    })
  })
}

function esperarArchivo(ruta, timeoutMs) {
  return new Promise((resolve) => {
    const inicio = Date.now()
    const intervalo = setInterval(() => {
      if (fs.existsSync(ruta)) {
        clearInterval(intervalo)
        resolve(fs.readFileSync(ruta, 'utf-8').trim())
      } else if (Date.now() - inicio > timeoutMs) {
        clearInterval(intervalo)
        resolve(null)
      }
    }, 1500)
  })
}

module.exports = {
  name: 'code',
  aliases: ['subbot', 'addsubbot'],
  description: 'Genera un código para vincular un subbot',
  category: 'subbot',
  ownerOnly: true,

  async execute(sock, msg, args, { config }) {
    const jid = msg.key.remoteJid
    const prefijo = config.PREFIXES[0]
    const numero = (args[0] || '').replace(/\D/g, '')

    if (!numero) {
      return sock.sendMessage(
        jid,
        { text: `❌ Escribe el número del subbot con lada, sin "+" ni espacios.\n📌 Ejemplo: ${prefijo}code 5218112345678` },
        { quoted: msg }
      )
    }

    const raiz = path.join(__dirname, '..', '..')
    const carpetaSubbot = path.join(raiz, 'subbots', numero)
    const credsPath = path.join(carpetaSubbot, 'session', 'creds.json')
    const codeFilePath = path.join(carpetaSubbot, 'code.txt')

    if (fs.existsSync(credsPath)) {
      return sock.sendMessage(
        jid,
        { text: `❌ Ese número ya tiene un subbot vinculado.\nUsa ${prefijo}delsubbot ${numero} para eliminarlo primero si quieres re-vincularlo.` },
        { quoted: msg }
      )
    }

    fs.mkdirSync(carpetaSubbot, { recursive: true })
    if (fs.existsSync(codeFilePath)) fs.unlinkSync(codeFilePath)

    await sock.sendMessage(jid, { text: `⏳ Iniciando subbot para +${numero}, esto puede tardar hasta 30 segundos...` }, { quoted: msg })

    const nombreProceso = `subbot-${numero}`
    const resultado = await ejecutar(`pm2 delete ${nombreProceso} 2>/dev/null; pm2 start subbot.js --name ${nombreProceso} -- ${numero}`, raiz)

    if (resultado.error) {
      return sock.sendMessage(
        jid,
        { text: `❌ No se pudo iniciar el subbot.\n\n\`\`\`${resultado.stderr || resultado.error.message}\`\`\`` },
        { quoted: msg }
      )
    }

    const code = await esperarArchivo(codeFilePath, 40000)

    if (!code) {
      return sock.sendMessage(
        jid,
        { text: `⚠️ El subbot se inició pero no generó el código a tiempo.\nRevisa \`pm2 logs ${nombreProceso}\` en el servidor.` },
        { quoted: msg }
      )
    }

    await ejecutar('pm2 save', raiz)

    await sock.sendMessage(
      jid,
      {
        text:
          `⛧───「 Código de vinculación 」───⛧\n\n` +
          `  ❖ número: +${numero}\n\n` +
          `╰─➤ _Ve a WhatsApp > Dispositivos vinculados > Vincular con número de teléfono, e ingresa el código de abajo en el celular de ese número_ 🥀`
      },
      { quoted: msg }
    )

    await sock.sendMessage(jid, { text: code })