// Código Oficial de YuiBot-MD.by AmilcarGit
import fs from 'fs'
import path from 'path'
import ajustes from './ajustes.js'
import { conectar } from './nucleo/enlace.js'
import { iniciarCargador } from './nucleo/cargador.js'
import { iniciarMemoria, guardar } from './nucleo/memoria.js'
import { iniciarSincro } from './nucleo/sincro.js'
import { limpiarTemporal } from './nucleo/temporal.js'
import { restaurarSubbots } from './nucleo/subbots.js'
import { preguntar } from './nucleo/utiles.js'

process.on('unhandledRejection', e => console.error(e))
process.on('uncaughtException', e => console.error(e))

const salir = () => {
  guardar()
  process.exit(0)
}

process.on('SIGINT', salir)
process.on('SIGTERM', salir)

async function arrancar() {
  limpiarTemporal()
  await iniciarMemoria()
  await iniciarCargador()
  iniciarSincro()

  const vinculada = fs.existsSync(path.join(ajustes.sesionPrincipal, 'creds.json'))
  let numero = null

  if (!vinculada && ajustes.login === 'codigo') {
    const dato = process.env.NUMERO_BOT || await preguntar('Número del bot con código de país: ')
    numero = dato.replace(/\D/g, '')
  }

  await conectar({ carpeta: ajustes.sesionPrincipal, numero, qr: ajustes.login === 'qr' })
  await restaurarSubbots()
}

arrancar()
