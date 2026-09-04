module.exports = {
  name: 'repetir',
  alias: ['repeat'],
  description: 'Repite un texto una cantidad determinada de veces',

  async execute(socket, msg, args) {
    if (args.length < 2) {
      return await msg.reply(
        '✳️ *USO DEL COMANDO*\n\n' +
        'Repite un texto varias veces.\n\n' +
        '📌 Ejemplo:\n' +
        '`.repetir 3 hola`'
      )
    }

    const cantidad = Number(args[0])
    const texto = args.slice(1).join(' ').trim()

    if (!Number.isInteger(cantidad) || cantidad < 1) {
      return await msg.reply('❌ La cantidad debe ser un número entero mayor que 0.')
    }

    if (cantidad > 20) {
      return await msg.reply('⚠️ Máximo permitido: *20 repeticiones*.')
    }

    if (!texto) {
      return await msg.reply('❌ Escribe el texto que quieres repetir.')
    }

    const resultado = Array(cantidad).fill(texto).join('\n')

    await msg.reply(resultado)
  }
}