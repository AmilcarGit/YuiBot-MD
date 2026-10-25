//CÓDIGO ORIGINAL DE YUIBOT-MD
const path = require('path')

module.exports = {
  BOT_NAME: 'YuiBot-MD',
  PREFIXES: ['!', '.', '/', '#'],
  ALLOW_NO_PREFIX: true,
  OWNERS: [
    { numero: '51910227479', nombre: 'AmilcarGit', rango: 'creador' },
    { numero: '584241819270', nombre: 'Leo', rango: 'colaborador' },
  ],
  BOT_VERSION: '1.0.0',
  USE_PAIRING_CODE: true,
  PHONE_NUMBER: '',
  PM2_PROCESS_NAME: 'YuiBot-MD',
  WELCOME_ENABLED: true,
  BYE_ENABLED: true, // mensaje de despedida cuando alguien sale del grupo
  WELCOME_BACKGROUND: 'https://files.catbox.moe/vajp5d.jpeg',
  PROFILE_BACKGROUND: 'https://files.catbox.moe/9fqfuv.png',
  // Si es true, el bot marca los mensajes entrantes como leídos (✓✓ azul)
  // automáticamente. Ponlo en false si prefieres que WhatsApp muestre que
  // el mensaje llegó pero no fue "leído".
  MARCAR_LEIDO: false,
  // Cola de envío anti-ban: espacia los mensajes para no parecer un robot (ver lib/colaEnvio.js).
  ANTIBAN: { ENABLED: true, MIN_CHAT_MS: 700, JITTER_MS: 300, MIN_GLOBAL_MS: 120, MAX_COLA_CHAT: 40 },
  // Logs de consola. LOG_MENSAJES imprime el texto de cada mensaje que recibe
  // el bot (útil para depurar, pero ruidoso y guarda conversaciones en los
  // logs de PM2); ponlo en false para registrar solo eventos del bot.
  // LOG_DEBUG imprime líneas técnicas extra de los subbots.
  LOG_MENSAJES: true,
  LOG_DEBUG: false,
  MANTENIMIENTO: {
    LIMPIEZA_PREKEYS_HORAS: 6,
    PREKEYS_DIAS_ANTIGUEDAD: 3,
    BACKUP_HORAS: 12,
    BACKUP_MAX: 5,
  },
  XP: {
    COOLDOWN_MS: 60000,
    MIN: 5,
    MAX: 15,
  },
  ECONOMIA: {
    DAILY: {
      COOLDOWN_MS: 86400000,
      MIN: 100,
      MAX: 300,
    },
    TRIVIA_RECOMPENSA: 50,
  },
  MODERACION: {
    ANTILINK: {
      ENABLED: true,
      AUTO_KICK: true,
      MAX_AVISOS: 3,
    },
    ANTIFLOOD: {
      ENABLED: true,
      MAX_MENSAJES: 5,
      VENTANA_MS: 7000,
    },
  },
  // Canal oficial de WhatsApp. Déjalo ENABLED: false hasta que tengas la
  // URL real (WhatsApp > tu canal > ⋮ > Compartir > Copiar enlace).
  NEWSLETTER: {
    ENABLED: false,
    NOMBRE: 'Canal oficial de YuiBot-MD',
    URL: '',
  },
  // Descargas con yt-dlp (YouTube, TikTok, Instagram, Facebook). Instálalo en Termux:
  //   pkg install yt-dlp ffmpeg
  // MODO: 'auto' = yt-dlp primero y la API como respaldo | 'local' = solo yt-dlp | 'api' = solo API
  // COOKIES: ruta a un cookies.txt (opcional, para Instagram/Facebook que piden iniciar sesión)
  DESCARGAS: { MODO: 'auto', BIN: 'yt-dlp', MAX_MB: 100, ALTURA: 720, COOKIES: '' },
  APIS: {
    LEMPI_KEY: 'lem_dc158e5ad3f4f6ee2de2905a222bfb68f61dd754',
    LEMPI_KEY_2: 'lem_10b02e6bcce68b82f51252de9d9ec71125528d02',
    EVOGB_KEY: 'evogb-jRhjmDSp',
    MITZUKI_KEY: 'sk-c8498d1dfbff805b5c10823a491082714dd76ac6f9a9e03dfe12ffc9b646d9a4',
    DVYER_KEY: 'dvyer069408482476',
    OCR_KEY: 'K83794019188957',
    ORBIT_KEY: 'ORBIT-4096939993',
  },
  // Botones de acceso rápido en el menú (📋 Menú completo + 2 categorías).
  // Si tu WhatsApp no los muestra, ponlo en false: el menú funciona igual con texto.
  MENU_BOTONES: true,
  // El menú sale en UN mensaje con una cajita desplegable "📂 Abrir menú" que
  // contiene todos los comandos por categoría (tocar uno lo ejecuta). false = menú clásico.
  MENU_LISTA: true,
  MENU_IMAGES: [
    { ruta: path.join(__dirname, 'media', 'menu1.mp4'), animado: true },
    { ruta: path.join(__dirname, 'media', 'menu2.jpg'), animado: false },
  ],
};
