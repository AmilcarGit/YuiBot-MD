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
text: '⛧───「 MAYÚSCULAS 」───⛧\n\nEscribe el texto que quieres convertir.\n\nEjemplo:\n.mayus hola mundo'
})
}

const resultado = texto.toLocaleUpperCase('es-ES')

await sock.sendMessage(msg.key.remoteJid, {
text: resultado
})
},

}