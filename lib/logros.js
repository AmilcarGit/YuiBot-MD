// Logros (insignias) y ranking semanal. Los logros se guardan en el usuario
// (data/usuarios.json), así que son los mismos en el principal y en los subbots.
const { obtenerUsuario, guardarUsuario, listarUsuarios, claveSemana } = require('./db')

// tier: bronce < plata < oro < diamante (define el color de la insignia)
const LOGROS = [
  { id: 'primeros-pasos', nombre: 'Primeros pasos', desc: 'Envía 10 mensajes', icono: '🌱', tier: 'bronce', campo: 'mensajes', meta: 10, premio: 50 },
  { id: 'conversador', nombre: 'Conversador', desc: 'Envía 100 mensajes', icono: '💬', tier: 'bronce', campo: 'mensajes', meta: 100, premio: 150 },
  { id: 'imparable', nombre: 'Imparable', desc: 'Envía 1000 mensajes', icono: '🔥', tier: 'plata', campo: 'mensajes', meta: 1000, premio: 600 },
  { id: 'leyenda-chat', nombre: 'Leyenda del chat', desc: 'Envía 5000 mensajes', icono: '👑', tier: 'oro', campo: 'mensajes', meta: 5000, premio: 2500 },
  { id: 'nivel-5', nombre: 'Aprendiz', desc: 'Llega al nivel 5', icono: '⭐', tier: 'bronce', campo: 'nivel', meta: 5, premio: 200 },
  { id: 'nivel-10', nombre: 'Guerrero', desc: 'Llega al nivel 10', icono: '⚔️', tier: 'plata', campo: 'nivel', meta: 10, premio: 500 },
  { id: 'nivel-25', nombre: 'Maestro', desc: 'Llega al nivel 25', icono: '🏅', tier: 'oro', campo: 'nivel', meta: 25, premio: 2000 },
  { id: 'nivel-50', nombre: 'Leyenda', desc: 'Llega al nivel 50', icono: '💎', tier: 'diamante', campo: 'nivel', meta: 50, premio: 10000 },
  { id: 'racha-3', nombre: 'Constante', desc: '3 días seguidos activo', icono: '📅', tier: 'bronce', campo: 'mejorRacha', meta: 3, premio: 100 },
  { id: 'racha-7', nombre: 'Fiel', desc: '7 días seguidos activo', icono: '🗓️', tier: 'plata', campo: 'mejorRacha', meta: 7, premio: 400 },
  { id: 'racha-30', nombre: 'Inquebrantable', desc: '30 días seguidos activo', icono: '🛡️', tier: 'oro', campo: 'mejorRacha', meta: 30, premio: 3000 },
  { id: 'rico', nombre: 'Ahorrador', desc: 'Junta 5000 monedas', icono: '💰', tier: 'plata', campo: 'monedas', meta: 5000, premio: 300 },
  { id: 'millonario', nombre: 'Millonario', desc: 'Junta 100000 monedas', icono: '🤑', tier: 'diamante', campo: 'monedas', meta: 100000, premio: 5000 },
  { id: 'querido', nombre: 'Querido', desc: 'Consigue 10 de reputación', icono: '💖', tier: 'plata', campo: 'reputacion', meta: 10, premio: 500 },
  { id: 'primer-sueldo', nombre: 'Primer sueldo', desc: 'Haz tu primer trabajo', icono: '💼', tier: 'bronce', campo: 'trabajosVeces', meta: 1, premio: 50 },
  { id: 'trabajador', nombre: 'Trabajador', desc: 'Haz 50 trabajos', icono: '⛏️', tier: 'plata', campo: 'trabajosVeces', meta: 50, premio: 400 },
  { id: 'adicto-trabajo', nombre: 'Adicto al trabajo', desc: 'Haz 300 trabajos', icono: '🏗️', tier: 'oro', campo: 'trabajosVeces', meta: 300, premio: 2000 },
  { id: 'buen-sueldo', nombre: 'Buen sueldo', desc: 'Gana 10000 monedas con trabajos', icono: '💵', tier: 'plata', campo: 'trabajosGanado', meta: 10000, premio: 500 },
  { id: 'magnate', nombre: 'Magnate', desc: 'Gana 100000 monedas con trabajos', icono: '🏦', tier: 'diamante', campo: 'trabajosGanado', meta: 100000, premio: 5000 },
  { id: 'equipado', nombre: 'Bien equipado', desc: 'Suma 10 niveles de mejoras', icono: '🛠️', tier: 'plata', campo: 'mejorasTotal', meta: 10, premio: 600 },
  { id: 'imperio', nombre: 'Imperio', desc: 'Suma 40 niveles de mejoras', icono: '🏰', tier: 'diamante', campo: 'mejorasTotal', meta: 40, premio: 6000 },
]

const COLORES_TIER = {
  bronce: '#cd7f32',
  plata: '#c0c8d4',
  oro: '#ffc83d',
  diamante: '#5de0ff',
}

function valorCampo(usuario, campo) {
  return Number(usuario?.[campo]) || 0
}

/** Progreso de cada logro para un usuario: [{...logro, actual, desbloqueado}] */
function progreso(usuario) {
  const mios = usuario?.logros || {}
  return LOGROS.map((l) => {
    const actual = valorCampo(usuario, l.campo)
    return { ...l, actual: Math.min(actual, l.meta), desbloqueado: Boolean(mios[l.id]) || actual >= l.meta }
  })
}

/**
 * Revisa los logros de alguien, guarda los nuevos y entrega el premio en monedas.
 * @returns {Array} logros recién desbloqueados
 */
function evaluar(numero, ahora = Date.now()) {
  const usuario = obtenerUsuario(numero)
  if (!usuario) return []
  const guardados = { ...(usuario.logros || {}) }
  const nuevos = []
  for (const l of LOGROS) {
    if (guardados[l.id]) continue
    if (valorCampo(usuario, l.campo) >= l.meta) {
      guardados[l.id] = ahora
      nuevos.push(l)
    }
  }
  if (nuevos.length) {
    const premio = nuevos.reduce((t, l) => t + l.premio, 0)
    guardarUsuario(numero, { logros: guardados, monedas: (usuario.monedas || 0) + premio })
  }
  return nuevos
}

/** Ranking semanal por XP ganada desde el lunes (hora de Perú). */
function topSemanal(limite = 10, ahora = Date.now()) {
  const semana = claveSemana(ahora)
  return Object.entries(listarUsuarios())
    .filter(([, u]) => u?.semana === semana && (u.xpSemana || 0) > 0)
    .map(([numero, u]) => ({ numero, xp: u.xpSemana, nivel: u.nivel || 0 }))
    .sort((a, b) => b.xp - a.xp)
    .slice(0, limite)
}

/** Posición global (1 = primero) por XP total; null si no tiene XP. */
function posicionGlobal(numero) {
  const todos = Object.entries(listarUsuarios()).map(([n, u]) => [n, u?.xp || 0]).filter(([, xp]) => xp > 0)
  todos.sort((a, b) => b[1] - a[1])
  const i = todos.findIndex(([n]) => n === numero)
  return i === -1 ? null : i + 1
}

module.exports = { LOGROS, COLORES_TIER, progreso, evaluar, topSemanal, posicionGlobal }
