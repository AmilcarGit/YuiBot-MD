module.exports = {
  name: 'mayus',
  alias: ['mayusculas', 'upper'],
  description: 'Convierte un texto a MAYÚSCULAS',

  async execute(socket, msg, args) {
    const texto = args.join(' ').trim()

    if (!texto) {
      return await msg.reply(
        '✳️ *USO DEL COMANDO*\n\n' +
        'Convierte cualquier texto a MAYÚSCULAS.\n\n' +
        '📌 Ejemplo:\n' +
        '`.mayus hola mundo`'
      )
    }

    const resultado = texto.toLocaleUpperCase('es-ES')

    await msg.reply(`🔠 *MAYÚSCULAS*\n\n${resultado}`)
  }
}