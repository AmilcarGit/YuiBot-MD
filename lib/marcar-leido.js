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

        if (sock?.ev?.on) {
          sock.ev.on('messages.upsert', async ({ messages, type }) => {
            if (type !== 'notify') return

            for (const message of messages) {
              if (!message?.key?.id || message.key.fromMe || !message.key.remoteJid) continue

              try {
                if (typeof sock.readMessages === 'function') {
                  await sock.readMessages([message.key])
                }

                if (typeof sock.chatModify === 'function') {
                  await sock.chatModify({ markRead: true }, message.key.remoteJid)
                }
              } catch (error) {
                console.error('[LECTURA] No se pudo marcar el chat como leído:', error?.message || error)
              }
            }
          })
        }

        return sock
      }

      instalado = true
    }
  }

  return exports
}
