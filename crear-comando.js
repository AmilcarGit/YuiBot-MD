//CÓDIGO ORIGINAL DE YUIBOT-MD
const fs = require('fs')
const path = require('path')
const readline = require('readline')

const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
const preguntar = (texto) => new Promise((resolve) => rl.question(texto, resolve))

async function main() {
  console.log('⛧───「 Crear comando — YuiBot-MD 」───⛧\n')

  const nombre = (await preguntar('Nombre del comando (ej: sticker): ')).trim().toLowerCase()
  const descripcion = (await preguntar('Descripción corta: ')).trim()
  const categoria = (await preguntar('Categoría (ej: main, download, owner): ')).trim().toLowerCase()
  const aliasesInput = await preguntar('Alias, separados por coma (opcional): ')
  const esOwner = (await preguntar('¿Solo para el owner? (s/n): ')).trim().toLowerCase() === 's'
  const usaNombreBot = (await preguntar('¿Este comando muestra el nombre del bot? (s/n): ')).trim().toLowerCase() === 's'

  rl.close()

  if (!nombre || !categoria) {
    console.log('❌ Nombre y categoría son obligatorios.')
    return
  }

  const aliases = aliasesInput
    .split(',')
    .map((a) => a.trim())
    .filter(Boolean)

  const carpeta = path.join(__dirname, 'modulos', categoria)
  const archivo = path.join(carpeta, `${nombre}.js`)

  if (fs.existsSync(archivo)) {
    console.log(`❌ Ya existe modulos/${categoria}/${nombre}.js`)
    return
  }

  fs.mkdirSync(carpeta, { recursive: true })

  const importDefaults = usaNombreBot
    ? `\n  async execute(sock, msg, args, { config }) {\n    const jid = msg.key.remoteJid\n    const texto = \`⛧───「 \${config.BOT_NAME} 」───⛧\\n\\nAquí tu respuesta.\`\n    await sock.sendMessage(jid, { text: texto })\n  },`
    : `\n  async execute(sock, msg, args) {\n    const jid = msg.key.remoteJid\n    await sock.sendMessage(jid, { text: 'Aquí tu respuesta.' })\n  },`

  const contenido = `//CÓDIGO ORIGINAL DE YUIBOT-MD
module.exports = {
  name: '${nombre}',
  aliases: [${aliases.map((a) => `'${a}'`).join(', ')}],
  description: '${descripcion}',
  category: '${categoria}',${esOwner ? '\n  ownerOnly: true,' : ''}
${importDefaults}
}
`

  fs.writeFileSync(archivo, contenido)
  console.log(`\n✅ Creado: modulos/${categoria}/${nombre}.js`)
  console.log('Ya lo puedes editar y agregar tu lógica adentro de execute().')
}

main()