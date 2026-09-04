//CÓDIGO ORIGINAL DE YUIBOT-MD

module.exports = {

name: 'invertir',
aliases: ['reverse'],
description: 'Invierte un texto',

category: 'utilidad',

async execute(sock, msg, args) {
const texto = args.join(' ').trim()

if (!texto) {
return await sock.sendMessage(msg.key.remoteJid, {
text: '⛧───「 INVERTIR 」───⛧\n\nEscribe el texto que quieres invertir.\n\nEjemplo:\n.invertir hola mundo'
})
}

const resultado = [...texto].reverse().join('')

await sock.sendMessage(msg.key.remoteJid, {
text: resultado
})
},

}