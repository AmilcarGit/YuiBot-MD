//CÓDIGO ORIGINAL DE YUIBOT-MD
const CATALOGO = [
  { id: 1, tipo: 'insignia', nombre: 'Novato', valor: '🌱', precio: 50, descripcion: 'Insignia para quien recién empieza' },
  { id: 2, tipo: 'insignia', nombre: 'Principiante', valor: '🔰', precio: 100, descripcion: 'Ya no eres tan nuevo' },
  { id: 3, tipo: 'insignia', nombre: 'Estrella', valor: '⭐', precio: 200, descripcion: 'Brillas un poco más' },
  { id: 4, tipo: 'insignia', nombre: 'Estrella Brillante', valor: '🌟', precio: 350, descripcion: 'Brillas bastante más' },
  { id: 5, tipo: 'insignia', nombre: 'En Racha', valor: '🔥', precio: 500, descripcion: 'Para los activos del grupo' },
  { id: 6, tipo: 'insignia', nombre: 'Diamante', valor: '💎', precio: 750, descripcion: 'Valioso y resistente' },
  { id: 7, tipo: 'insignia', nombre: 'Campeón', valor: '🏆', precio: 1000, descripcion: 'Insignia de campeón' },
  { id: 8, tipo: 'insignia', nombre: 'Realeza', valor: '👑', precio: 1500, descripcion: 'Para la realeza del grupo' },
  { id: 9, tipo: 'insignia', nombre: 'Elegante', valor: '🦋', precio: 300, descripcion: 'Ligero y elegante' },
  { id: 10, tipo: 'insignia', nombre: 'Dragón', valor: '🐉', precio: 2000, descripcion: 'Insignia legendaria' },
  { id: 11, tipo: 'insignia', nombre: 'León', valor: '🦁', precio: 1200, descripcion: 'Rey de la selva' },
  { id: 12, tipo: 'insignia', nombre: 'Certero', valor: '🎯', precio: 400, descripcion: 'Nunca falla' },
  { id: 13, tipo: 'insignia', nombre: 'Artista', valor: '🎨', precio: 350, descripcion: 'Alma creativa' },
  { id: 14, tipo: 'insignia', nombre: 'Gamer', valor: '🎮', precio: 300, descripcion: 'Nacido para jugar' },
  { id: 15, tipo: 'insignia', nombre: 'Cohete', valor: '🚀', precio: 600, descripcion: 'Directo a la cima' },
  { id: 16, tipo: 'insignia', nombre: 'Nocturno', valor: '🌙', precio: 450, descripcion: 'Activo de madrugada' },
  { id: 17, tipo: 'insignia', nombre: 'Solar', valor: '☀️', precio: 450, descripcion: 'Energía todo el día' },
  { id: 18, tipo: 'insignia', nombre: 'Suertudo', valor: '🍀', precio: 700, descripcion: 'La suerte te sonríe' },
  { id: 19, tipo: 'insignia', nombre: 'Temerario', valor: '💀', precio: 900, descripcion: 'Sin miedo a nada' },
  { id: 20, tipo: 'insignia', nombre: 'YuiBot', valor: '🌸', precio: 5000, descripcion: 'La insignia más exclusiva' },

  { id: 21, tipo: 'color', nombre: 'Rojo Carmesí', valor: '#d13c3c', precio: 100, descripcion: 'Color de barra de XP' },
  { id: 22, tipo: 'color', nombre: 'Azul Océano', valor: '#2f80ed', precio: 100, descripcion: 'Color de barra de XP' },
  { id: 23, tipo: 'color', nombre: 'Verde Esmeralda', valor: '#27ae60', precio: 100, descripcion: 'Color de barra de XP' },
  { id: 24, tipo: 'color', nombre: 'Amarillo Dorado', valor: '#f2c94c', precio: 150, descripcion: 'Color de barra de XP' },
  { id: 25, tipo: 'color', nombre: 'Naranja Atardecer', valor: '#f2994a', precio: 150, descripcion: 'Color de barra de XP' },
  { id: 26, tipo: 'color', nombre: 'Rosa Sakura', valor: '#ff8fd6', precio: 200, descripcion: 'Color de barra de XP' },
  { id: 27, tipo: 'color', nombre: 'Morado Real', valor: '#9b51e0', precio: 200, descripcion: 'Color de barra de XP' },
  { id: 28, tipo: 'color', nombre: 'Turquesa', valor: '#1dd3b0', precio: 250, descripcion: 'Color de barra de XP' },
  { id: 29, tipo: 'color', nombre: 'Plateado', valor: '#c0c0c0', precio: 300, descripcion: 'Color de barra de XP' },
  { id: 30, tipo: 'color', nombre: 'Fuego Intenso', valor: '#ff5f6d', precio: 800, descripcion: 'El color más llamativo' },

  { id: 31, tipo: 'titulo', nombre: 'El Novato', valor: 'El Novato', precio: 150, descripcion: 'Título para tu perfil' },
  { id: 32, tipo: 'titulo', nombre: 'Guardián del Grupo', valor: 'Guardián del Grupo', precio: 500, descripcion: 'Título para tu perfil' },
  { id: 33, tipo: 'titulo', nombre: 'Leyenda Viviente', valor: 'Leyenda Viviente', precio: 2000, descripcion: 'Título para tu perfil' },
  { id: 34, tipo: 'titulo', nombre: 'Cazador de XP', valor: 'Cazador de XP', precio: 400, descripcion: 'Título para tu perfil' },
  { id: 35, tipo: 'titulo', nombre: 'Rey de la Trivia', valor: 'Rey de la Trivia', precio: 600, descripcion: 'Título para tu perfil' },
  { id: 36, tipo: 'titulo', nombre: 'Coleccionista de Monedas', valor: 'Coleccionista de Monedas', precio: 500, descripcion: 'Título para tu perfil' },
  { id: 37, tipo: 'titulo', nombre: 'Fantasma del Chat', valor: 'Fantasma del Chat', precio: 350, descripcion: 'Título para tu perfil' },
  { id: 38, tipo: 'titulo', nombre: 'Sabio del Grupo', valor: 'Sabio del Grupo', precio: 700, descripcion: 'Título para tu perfil' },
  { id: 39, tipo: 'titulo', nombre: 'Corazón de León', valor: 'Corazón de León', precio: 800, descripcion: 'Título para tu perfil' },
  { id: 40, tipo: 'titulo', nombre: 'Elegido de YuiBot', valor: 'Elegido de YuiBot', precio: 3000, descripcion: 'El título más exclusivo' },

  { id: 41, tipo: 'boost', nombre: 'Doble XP (1 hora)', valor: { tipo: 'xp', multiplicador: 2, duracionMs: 3600000 }, precio: 200, descripcion: 'Duplica tu XP por 1 hora' },
  { id: 42, tipo: 'boost', nombre: 'Doble XP (6 horas)', valor: { tipo: 'xp', multiplicador: 2, duracionMs: 21600000 }, precio: 900, descripcion: 'Duplica tu XP por 6 horas' },
  { id: 43, tipo: 'boost', nombre: 'Doble XP (24 horas)', valor: { tipo: 'xp', multiplicador: 2, duracionMs: 86400000 }, precio: 2500, descripcion: 'Duplica tu XP por 24 horas' },
  { id: 44, tipo: 'boost', nombre: 'Triple XP (1 hora)', valor: { tipo: 'xp', multiplicador: 3, duracionMs: 3600000 }, precio: 400, descripcion: 'Triplica tu XP por 1 hora' },
  { id: 45, tipo: 'boost', nombre: 'Doble Monedas (1 hora)', valor: { tipo: 'monedas', multiplicador: 2, duracionMs: 3600000 }, precio: 250, descripcion: 'Duplica tus monedas ganadas por 1 hora' },
  { id: 46, tipo: 'boost', nombre: 'Doble Monedas (6 horas)', valor: { tipo: 'monedas', multiplicador: 2, duracionMs: 21600000 }, precio: 1000, descripcion: 'Duplica tus monedas ganadas por 6 horas' },
  { id: 47, tipo: 'boost', nombre: 'Doble Monedas (24 horas)', valor: { tipo: 'monedas', multiplicador: 2, duracionMs: 86400000 }, precio: 2800, descripcion: 'Duplica tus monedas ganadas por 24 horas' },
  { id: 48, tipo: 'boost', nombre: 'Triple Monedas (1 hora)', valor: { tipo: 'monedas', multiplicador: 3, duracionMs: 3600000 }, precio: 500, descripcion: 'Triplica tus monedas ganadas por 1 hora' },
  { id: 49, tipo: 'proteccion', nombre: 'Escudo Antiflood (24h)', valor: { duracionMs: 86400000 }, precio: 600, descripcion: 'No recibirás avisos de antiflood por 24 horas' },
  { id: 50, tipo: 'cofre', nombre: 'Cofre Misterioso', valor: { min: 50, max: 500 }, precio: 150, descripcion: 'Monedas al azar al instante' },
]

function obtenerItem(id) {
  return CATALOGO.find((item) => item.id === id) || null
}

module.exports = { CATALOGO, obtenerItem }