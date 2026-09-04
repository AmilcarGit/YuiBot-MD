//CÓDIGO ORIGINAL DE YUIBOT-MD

module.exports = {

name: 'minus',
aliases: ['minusculas', 'lower'],
description: 'Convierte un texto a minúsculas',

category: 'utilidad',

async execute(sock, msg, args) {
const texto = args.join(' ').trim()

if (!texto) {
return await sock.sendMessage(msg.key.remoteJid, {
text: '⛧───「 MINÚSCULAS 」───⛧\n\nEscribe el texto que quieres convertir.\n\nEjemplo:\n.minus HOLA MUNDO'
})
}

const resultado = texto.toLocaleLowerCase('es-ES')

await sock.sendMessage(msg.key.remoteJid, {
text: resultado
})
},

}