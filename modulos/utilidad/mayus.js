//CÓDIGO ORIGINAL DE YUIBOT-MD

module.exports = {

name: 'mayus',
aliases: ['mayusculas', 'upper'],
description: 'Convierte un texto a MAYÚSCULAS',

category: 'utilidad',

async execute(sock, msg, args) {
const texto = args.join(' ').trim()

if (!texto) {
return await sock.sendMessage(msg.key.remoteJid, {
text: '❌ Escribe el texto que quieres convertir.\n\n📌 Ejemplo: .mayus hola mundo'
})
}

const resultado = texto.toLocaleUpperCase('es-ES')

await sock.sendMessage(msg.key.remoteJid, {
text: resultado
})
},

}