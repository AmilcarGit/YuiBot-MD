// Código Oficial de YuiBot-MD.by AmilcarGit
import 'dotenv/config'
import path from 'path'

const lista = (valor, defecto) => (valor ?? defecto).split(',').map(x => x.trim()).filter(Boolean)

export default {
  nombre: 'YuiBot-MD',
  creador: 'AmilcarGit',
  dueno: lista(process.env.DUENO, '51910227479'),
  prefijos: lista(process.env.PREFIJOS, '.,!,#,/'),
  login: process.env.LOGIN === 'qr' ? 'qr' : 'codigo',
  sesionPrincipal: path.join('alma', 'principal'),
  sesionSubbots: path.join('alma', 'subbots'),
  maxSubbots: Number(process.env.MAX_SUBBOTS || 5),
  motor: process.env.MEMORIA_MOTOR === 'sqlite' ? 'sqlite' : 'json',
  // Base de datos oficial de Yui (ranking y chat web). Para usar la tuya cambia DATOS_URL; para desactivarla, DATOS_URL=off.
  datosUrl: /^(off|no|false|0)$/i.test(process.env.DATOS_URL?.trim() || '') ? '' : (process.env.DATOS_URL?.trim() || 'https://yuibot-datos.vercel.app'),
  sincroMs: 120000,
  retardo: [800, 2000],
  falsos: lista(process.env.FALSOS, '')
}
