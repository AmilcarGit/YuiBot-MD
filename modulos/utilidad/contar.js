//CÓDIGO ORIGINAL DE YUIBOT-MD
const E = require('../../lib/estilo')

module.exports = {

name: 'contar',
aliases: ['contador', 'count'],
description: 'Cuenta palabras y caracteres de un texto',

category: 'utilidad',

async execute(sock, msg, args) {
const texto = args.join(' ').trim()

if (!texto) {
return await sock.sendMessage(msg.key.remoteJid, {
text: '❌ Escribe el texto que quieres contar.\n\n📌 Ejemplo: .contar hola mundo'
})
}

const palabras = texto.split(/\s+/).filter(Boolean).length
const caracteres = [...texto].length
const sinEspacios = [...texto.replace(/\s/g, '')].length

const resultado = E.caja('📝', 'Contador', [
['Palabras', palabras, '📝'],
['Caracteres', caracteres, '🔤'],
['Sin espacios', sinEspacios, '🔡'],
], 'YuiBot-MD')

await sock.sendMessage(msg.key.remoteJid, {
text: resultado
})
},

}