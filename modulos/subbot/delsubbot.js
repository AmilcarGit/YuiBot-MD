//CÓDIGO ORIGINAL DE YUIBOT-MD
const { exec } = require('child_process')
const fs = require('fs')
const path = require('path')
const { obtenerCandidatosPropietario } = require('../../lib/handler')
const { esOwnerPrincipal } = require('../../lib/permisos')
const { esDuenoDeSubbot } = require('../../lib/subbots')

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
  ownerOnly: false,

  async execute(sock, msg, args, { config }) {
    const jid = msg.key.remoteJid
    const prefijo = config.PREFIXES[0]
    const numero = (args[0] || '').replace(/\D/g, '')

    if (!numero) {
      return sock.sendMessage(jid, { text: `❌ Escribe el número del subbot a eliminar.\n📌 Ejemplo: ${prefijo}delsubbot 5218112345678` }, { quoted: msg })
    }

    // Solo el owner del bot principal o el dueño registrado de ESE subbot
    // pueden eliminarlo (antes cualquiera podía borrar el subbot de otro).
    const puedeEliminar =
      esOwnerPrincipal(sock, msg, config) ||
      esDuenoDeSubbot(numero, obtenerCandidatosPropietario(sock, msg))

    if (!puedeEliminar) {
      return sock.sendMessage(jid, { text: '⛔ Solo el owner del bot o el dueño de ese subbot pueden eliminarlo.' }, { quoted: msg })
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