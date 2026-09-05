//CÓDIGO ORIGINAL DE YUIBOT-MD
const Module = require('module')

const cargarOriginal = Module._load
let instalado = false

Module._load = function (request, parent, isMain) {
  const exports = cargarOriginal.apply(this, arguments)

  if (request === '@whiskeysockets/baileys' && exports && !instalado) {
    const crearSocketOriginal = exports.default

    if (typeof crearSocketOriginal === 'function') {
      exports.default = function (...args) {
        const sock = crearSocketOriginal.apply(this, args)

        if (sock?.ev?.on && typeof sock.readMessages === 'function') {
          sock.ev.on('messages.upsert', async ({ messages, type }) => {
            if (type !== 'notify') return

            const claves = messages
              .filter((message) => message?.key?.id && !message.key.fromMe)
              .map((message) => message.key)

            if (!claves.length) return

            try {
              await sock.readMessages(claves)
            } catch {}
          })
        }

        return sock
      }

      instalado = true
    }
  }

  return exports
}
