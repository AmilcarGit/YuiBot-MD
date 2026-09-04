module.exports = {
  name: 'minus',
  alias: ['minusculas', 'lower'],
  description: 'Convierte un texto a minúsculas',

  async execute(socket, msg, args) {
    const texto = args.join(' ').trim()

    if (!texto) {
      return await msg.reply(
        '✳️ *USO DEL COMANDO*\n\n' +
        'Convierte cualquier texto a minúsculas.\n\n' +
        '📌 Ejemplo:\n' +
        '`.minus HOLA MUNDO`'
      )
    }

    const resultado = texto.toLocaleLowerCase('es-ES')

    await msg.reply(`🔡 *MINÚSCULAS*\n\n${resultado}`)
  }
}