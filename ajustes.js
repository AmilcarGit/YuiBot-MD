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
  datosUrl: process.env.DATOS_URL || '',
  sincroMs: 120000,
  retardo: [800, 2000],
  falsos: lista(process.env.FALSOS, '')
}
