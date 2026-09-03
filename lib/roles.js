//CÓDIGO ORIGINAL DE YUIBOT-MD
const RANGOS_POR_NIVEL = [
  { nivel: 1, nombre: 'Novato' },
  { nivel: 5, nombre: 'Aprendiz' },
  { nivel: 10, nombre: 'Guerrero' },
  { nivel: 15, nombre: 'Veterano' },
  { nivel: 20, nombre: 'Experto' },
  { nivel: 30, nombre: 'Maestro' },
  { nivel: 40, nombre: 'Gran Maestro' },
  { nivel: 50, nombre: 'Leyenda' },
]

function obtenerRangoPorNivel(nivel) {
  let actual = null
  for (const rango of RANGOS_POR_NIVEL) {
    if (nivel >= rango.nivel) actual = rango
  }
  return actual
}

function obtenerRangoExacto(nivel) {
  return RANGOS_POR_NIVEL.find((r) => r.nivel === nivel) || null
}

module.exports = { RANGOS_POR_NIVEL, obtenerRangoPorNivel, obtenerRangoExacto }