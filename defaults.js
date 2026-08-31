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
  APIS: {
    LEMPI_KEY: 'lem_dc158e5ad3f4f6ee2de2905a222bfb68f61dd754',
  },
  MENU_IMAGES: [
    path.join(__dirname, 'media', 'menu1.gif'),
    path.join(__dirname, 'media', 'menu2.jpg'),
  ],
};