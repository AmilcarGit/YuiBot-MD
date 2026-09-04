module.exports = {
  name: 'contar',
  alias: ['contador', 'count'],
  description: 'Cuenta palabras y caracteres de un texto',

  async execute(socket, msg, args) {
    const texto = args.join(' ').trim()

    if (!texto) {
      return await msg.reply(
        '✳️ *USO DEL COMANDO*\n\n' +
        'Cuenta palabras y caracteres de un texto.\n\n' +
        '📌 Ejemplo:\n' +
        '`.contar hola mundo`'
      )
    }

    const palabras = texto.split(/\s+/).filter(Boolean).length
    const caracteres = [...texto].length
    const caracteresSinEspacios = [...texto.replace(/\s/g, '')].length

    await msg.reply(
      '📊 *ESTADÍSTICAS DEL TEXTO*\n\n' +
      `📝 Palabras: *${palabras}*\n` +
      `🔤 Caracteres: *${caracteres}*\n` +
      `🔡 Sin espacios: *${caracteresSinEspacios}*`
    )
  }
}