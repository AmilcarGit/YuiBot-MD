//CÓDIGO ORIGINAL DE YUIBOT-MD

module.exports = {

name: 'tarea',

aliases: ['tareas', 'task'],

description: 'Administra tus tareas escolares',

category: 'escuela',

async execute(sock, msg, args) {
const jid = msg.key.remoteJid

if (!args.length) {
return await sock.sendMessage(jid, {
text:
'📚「 TAREAS 」\n\n' +
'Puedes usar:\n\n' +
'➕ .tarea agregar <materia> - <tarea>\n' +
'📋 .tarea lista\n' +
'❌ .tarea eliminar <número>\n' +
'✅ .tarea completar <número>\n' +
'🗑️ .tarea limpiar\n\n' +
'Ejemplo:\n' +
'.tarea agregar Matemáticas - Resolver ejercicios 1 al 10'
})
}

const accion = args[0].toLowerCase()

if (accion === 'agregar' || accion === 'add') {
const contenido = args.slice(1).join(' ').trim()

if (!contenido) {
return await sock.sendMessage(jid, {
text: '❌ Escribe la materia y la tarea.\n\nEjemplo:\n.tarea agregar Matemáticas - Resolver ejercicios 1 al 10'
})
}

let partes = contenido.split(/\s+-\s+/)

if (partes.length < 2) {
return await sock.sendMessage(jid, {
text: '❌ Separa la materia y la tarea con " - ".\n\nEjemplo:\n.tarea agregar Matemáticas - Resolver ejercicios 1 al 10'
})
}

const materia = partes.shift().trim()
const tarea = partes.join(' - ').trim()

if (!materia || !tarea) {
return await sock.sendMessage(jid, {
text: '❌ La materia y la tarea no pueden estar vacías.'
})
}

return await sock.sendMessage(jid, {
text:
'✅ Tarea registrada.\n\n' +
`📚 Materia: ${materia}\n` +
`📝 Tarea: ${tarea}\n\n` +
'⚠️ Nota: esta primera versión solo muestra la tarea registrada. '
})
}

if (accion === 'lista' || accion === 'listar') {
return await sock.sendMessage(jid, {
text:
'📋「 LISTA DE TAREAS 」\n\n' +
'No tienes tareas guardadas todavía.\n\n' +
'Usa:\n' +
'.tarea agregar Matemáticas - Resolver ejercicios'
})
}

if (accion === 'eliminar' || accion === 'delete') {
return await sock.sendMessage(jid, {
text: '❌ Todavía no hay tareas guardadas para eliminar.'
})
}

if (accion === 'completar' || accion === 'complete') {
return await sock.sendMessage(jid, {
text: '✅ Todavía no hay tareas guardadas para completar.'
})
}

if (accion === 'limpiar' || accion === 'clear') {
return await sock.sendMessage(jid, {
text: '🗑️ No hay tareas guardadas para limpiar.'
})
}

await sock.sendMessage(jid, {
text:
`❌ Acción desconocida: ${accion}\n\n` +
'Usa .tarea para ver las opciones disponibles.'
})
},

}