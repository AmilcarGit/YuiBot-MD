// Código Oficial de YuiBot-MD.by AmilcarGit
import 'dotenv/config'
import path from 'path'
import fs from 'fs'

const lista = (valor, defecto) => (valor ?? defecto).split(',').map(x => x.trim()).filter(Boolean)

// Imagen, GIF o video del menú: un enlace directo (MENU_MEDIA=https://...) o un archivo en la carpeta media/ (menu.mp4, menu.jpg, menu.png, menu.webp o menu.gif).
// Si no hay ninguno de los dos, se usa el video oficial del menú. MENU_MEDIA=off lo desactiva.
const medioMenu = () => {
  const env = process.env.MENU_MEDIA?.trim()
  if (/^(off|no|false|0)$/i.test(env || '')) return ''
  if (env) return env
  return ['mp4', 'gif', 'jpg', 'jpeg', 'png', 'webp'].map(e => path.join('media', `menu.${e}`)).find(f => fs.existsSync(f)) || 'https://files.catbox.moe/rcfcf3.mp4'
}

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
  menuMedia: medioMenu(),
  sincroMs: 120000,
  // APIs de descargas. Las claves van aquí por defecto; para cambiarlas usa NEXORA_KEY / YOSOYO_KEY en .env.
  descargas: {
    yuiapi: { url: process.env.YUIAPI_URL?.trim() || 'https://yuiapi.vercel.app', clave: process.env.YUIAPI_KEY?.trim() || 'amk_i9vKkMEpbyOOueT2YcPxs68JFH3JaFzw' },
    nexora: { url: process.env.NEXORA_URL?.trim() || 'https://nexora-api-max6.onrender.com', clave: process.env.NEXORA_KEY?.trim() || 'nexora_1iw82j8LXamd1Qk4OVA8rjR5Bst0txDl' },
    yosoyo: { url: process.env.YOSOYO_URL?.trim() || 'https://api-yosoyyo-api-ofc.onrender.com', clave: process.env.YOSOYO_KEY?.trim() || 'AmilcarGit' },
    maxAudioBytes: 16 * 1024 * 1024, // más pesado que esto va por enlace
    espera: 45000 // las APIs gratuitas de Render pueden tardar en "despertar"
  },
  retardo: [800, 2000],
  falsos: lista(process.env.FALSOS, '')
}
