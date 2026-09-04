//CÓDIGO ORIGINAL DE YUIBOT-MD

module.exports = {

name: 'repetir',
aliases: ['repeat'],
description: 'Repite un texto varias veces',

category: 'utilidad',

async execute(sock, msg, args) {
if (args.length < 2) {
return await sock.sendMessage(msg.key.remoteJid, {
text: '⛧───「 REPETIR 」───⛧\n\nUsa el comando así:\n.repetir 3 hola'
})
}

const cantidad = Number(args[0])
const texto = args.slice(1).join(' ').trim()

if (!Number.isInteger(cantidad) || cantidad < 1) {
return await sock.sendMessage(msg.key.remoteJid, {
text: '❌ La cantidad debe ser un número entero mayor que 0.'
})
}

if (cantidad > 20) {
return await sock.sendMessage(msg.key.remoteJid, {
text: '⚠️ El máximo es de 20 repeticiones.'
})
}

if (!texto) {
return await sock.sendMessage(msg.key.remoteJid, {
text: '❌ Escribe el texto que quieres repetir.'
})
}

const resultado = Array(cantidad).fill(texto).join('\n')

await sock.sendMessage(msg.key.remoteJid, {
text: resultado
})
},

}