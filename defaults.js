//CÓDIGO ORIGINAL DE YUIBOT-MD
const path = require('path')

module.exports = {
  BOT_NAME: 'YuiBot-MD',
  PREFIXES: ['!', '.', '/', '#'],
  ALLOW_NO_PREFIX: true,
  OWNERS: [
    { numero: '51910227479', nombre: 'AmilcarGit', rango: 'creador' },
  ],
  BOT_VERSION: '1.0.0',
  USE_PAIRING_CODE: true,
  PHONE_NUMBER: '',
  PM2_PROCESS_NAME: 'YuiBot-MD',
  WELCOME_ENABLED: true,
  WELCOME_BACKGROUND: 'https://files.catbox.moe/vajp5d.jpeg',
  APIS: {
    LEMPI_KEY: 'lem_dc158e5ad3f4f6ee2de2905a222bfb68f61dd754',
    EVOGB_KEY: 'evogb-jRhjmDSp',
    MITZUKI_KEY: 'sk-c8498d1dfbff805b5c10823a491082714dd76ac6f9a9e03dfe12ffc9b646d9a4',
    DVYER_KEY: 'dvyer069408482476',
  },
  MENU_IMAGES: [
    { ruta: path.join(__dirname, 'media', 'menu1.mp4'), animado: true },
    { ruta: path.join(__dirname, 'media', 'menu2.jpg'), animado: false },
  ],
};