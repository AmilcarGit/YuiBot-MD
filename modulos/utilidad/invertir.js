module.exports = {
  name: 'invertir',
  alias: ['reverse'],
  description: 'Invierte el texto',

  async execute(socket, msg, args) {
    const texto = args.join(' ').trim()

    if (!texto) {
      return await msg.reply(
        '✳️ *USO DEL COMANDO*\n\n' +
        'Invierte el orden de los caracteres.\n\n' +
        '📌 Ejemplo:\n' +
        '`.invertir hola mundo`'
      )
    }

    const resultado = [...texto].reverse().join('')

    await msg.reply(`🔄 *TEXTO INVERTIDO*\n\n${resultado}`)
  }
}