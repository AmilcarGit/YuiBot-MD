// Código Oficial de YuiBot-MD.by AmilcarGit
export const trabajos = [
  { id: 'granjero', nombre: 'Granjero', nivel: 1, pago: [80, 160], espera: 1800000 },
  { id: 'minero', nombre: 'Minero', nivel: 3, pago: [150, 300], espera: 2700000 },
  { id: 'cazador', nombre: 'Cazador', nivel: 6, pago: [280, 520], espera: 3600000 },
  { id: 'programador', nombre: 'Programador', nivel: 10, pago: [500, 900], espera: 5400000 }
]

export const tienda = [
  { id: 'pico', nombre: 'Pico de hierro', precio: 800, efecto: 'Trabajos +25%' },
  { id: 'mochila', nombre: 'Mochila', precio: 600, efecto: 'Recompensa diaria +100' },
  { id: 'amuleto', nombre: 'Amuleto de la suerte', precio: 1500, efecto: 'Más suerte en el gacha' }
]

export const rarezas = [
  { nombre: 'Común', peso: 70, personajes: ['Aprendiz', 'Mensajera', 'Guardia'] },
  { nombre: 'Rara', peso: 22, personajes: ['Hechicera', 'Arquero', 'Alquimista'] },
  { nombre: 'Épica', peso: 7, personajes: ['Caballera de Luz', 'Invocador'] },
  { nombre: 'Legendaria', peso: 1, personajes: ['Yui, Guardiana del Alma'] }
]

export const logros = {
  primerTrabajo: 'Primer trabajo',
  racha7: 'Racha de 7 días',
  nivel10: 'Nivel 10',
  legendario: 'Personaje legendario'
}

export function logro(u, id) {
  if (u.logros.includes(id)) return false
  u.logros.push(id)
  return true
}

export const nivelDe = xp => Math.floor(Math.sqrt(Math.max(0, xp) / 20)) + 1

// Lunes de la semana (hora de Perú, como la base de datos) en formato AAAA-MM-DD.
export function semanaActual(ahora = Date.now()) {
  const d = new Date(ahora - 5 * 3600000)
  const atras = (d.getUTCDay() + 6) % 7
  return new Date(d.getTime() - atras * 86400000).toISOString().slice(0, 10)
}

export function ganarXp(u, cantidad) {
  u.xp += cantidad
  const semana = semanaActual()
  if (u.semana !== semana) {
    u.semana = semana
    u.xpSemana = 0
  }
  u.xpSemana = (u.xpSemana || 0) + cantidad
  const nivel = nivelDe(u.xp)
  const subio = nivel > u.nivel
  u.nivel = Math.max(u.nivel, nivel)
  if (u.nivel >= 10) logro(u, 'nivel10')
  return subio
}

export function tirar(suerte) {
  const pesos = rarezas.map(r => (r.nombre === 'Legendaria' && suerte ? r.peso * 3 : r.peso))
  let punto = Math.random() * pesos.reduce((a, b) => a + b, 0)
  for (let i = 0; i < rarezas.length; i++) {
    punto -= pesos[i]
    if (punto <= 0) return elegir(rarezas[i])
  }
  return elegir(rarezas[0])
}

function elegir(rareza) {
  const personaje = rareza.personajes[Math.floor(Math.random() * rareza.personajes.length)]
  return { rareza: rareza.nombre, personaje }
}
