//CÓDIGO ORIGINAL DE YUIBOT-MD

module.exports = {

name: 'contar',
aliases: ['contador', 'count'],
description: 'Cuenta palabras y caracteres de un texto',

category: 'utilidad',

async execute(sock, msg, args) {
const texto = args.join(' ').trim()

if (!texto) {
return await sock.sendMessage(msg.key.remoteJid, {
text: '⛧───「 CONTADOR 」───⛧\n\nEscribe el texto que quieres contar.\n\nEjemplo:\n.contar hola mundo'
})
}

const palabras = texto.split(/\s+/).filter(Boolean).length
const caracteres = [...texto].length
const sinEspacios = [...texto.replace(/\s/g, '')].length

const resultado =
'⛧───「 CONTADOR 」───⛧\n\n' +
`📝 Palabras: ${palabras}\n` +
`🔤 Caracteres: ${caracteres}\n` +
`🔡 Sin espacios: ${sinEspacios}`

await sock.sendMessage(msg.key.remoteJid, {
text: resultado
})
},

}