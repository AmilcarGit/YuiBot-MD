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
  WELCOME_BACKGROUND: 'https://files.catbox.moe/vajp5d.jpeg',
  PROFILE_BACKGROUND: 'https://files.catbox.moe/9fqfuv.png',
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
  APIS: {
    LEMPI_KEY: 'lem_dc158e5ad3f4f6ee2de2905a222bfb68f61dd754',
    LEMPI_KEY_2: 'YuiBot-MD167h7hw',
    EVOGB_KEY: 'evogb-jRhjmDSp',
    MITZUKI_KEY: 'sk-c8498d1dfbff805b5c10823a491082714dd76ac6f9a9e03dfe12ffc9b646d9a4',
    DVYER_KEY: 'dvyer069408482476',
    OCR_KEY: 'K83794019188957',
  },
  MENU_IMAGES: [
    { ruta: path.join(__dirname, 'media', 'menu1.mp4'), animado: true },
    { ruta: path.join(__dirname, 'media', 'menu2.jpg'), animado: false },
  ],
};