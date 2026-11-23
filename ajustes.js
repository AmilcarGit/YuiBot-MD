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
  // Botones nativos de WhatsApp (Yui-Bails). BOTONES=off los reemplaza por texto con atajos.
  botones: !/^(off|no|false|0)$/i.test(process.env.BOTONES?.trim() || ''),
  // 'buttons' = botones clásicos (los demás ven la respuesta como texto normal, sin aviso de "actualiza WhatsApp"). 'interactive' = botones modernos.
  botonesFormato: /^interactive$/i.test(process.env.BOTONES_FORMATO?.trim() || '') ? 'interactive' : 'buttons',
  datosUrl: /^(off|no|false|0)$/i.test(process.env.DATOS_URL?.trim() || '') ? '' : (process.env.DATOS_URL?.trim() || 'https://yuibot-datos.vercel.app'),
  sincroMs: 120000,
  // APIs de descargas. Las claves van aquí por defecto; para cambiarlas usa NEXORA_KEY / YOSOYO_KEY en .env.
  descargas: {
    nexora: { url: process.env.NEXORA_URL?.trim() || 'https://nexora-api-max6.onrender.com', clave: process.env.NEXORA_KEY?.trim() || 'nexora_1iw82j8LXamd1Qk4OVA8rjR5Bst0txDl' },
    yosoyo: { url: process.env.YOSOYO_URL?.trim() || 'https://api-yosoyyo-api-ofc.onrender.com', clave: process.env.YOSOYO_KEY?.trim() || 'AmilcarGit' },
    espera: 45000 // las APIs gratuitas de Render pueden tardar en "despertar"
  },
  retardo: [800, 2000],
  falsos: lista(process.env.FALSOS, '')
}
