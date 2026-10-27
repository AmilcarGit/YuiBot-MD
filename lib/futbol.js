// Fútbol en vivo con la API pública de ESPN (gratis y sin API key).
//   marcadores:  site.api.espn.com/apis/site/v2/sports/soccer/<liga>/scoreboard?dates=AAAAMMDD-AAAAMMDD
//   posiciones:  site.api.espn.com/apis/v2/sports/soccer/<liga>/standings
// Las respuestas se guardan 30 s para no repetir peticiones cuando varias
// personas preguntan a la vez.
const { fetchSeguro } = require('./http')
const { reintentar } = require('./reintentar')
const { claveDia } = require('./db')
const { OFFSET_HORAS } = require('./fechas')

const BASE_SITE = 'https://site.api.espn.com/apis/site/v2/sports/soccer'
const BASE_V2 = 'https://site.api.espn.com/apis/v2/sports/soccer'
const TTL_CACHE_MS = 30000
const DIA_MS = 86400000

// clave → { slug de ESPN, nombre, alias }
const LIGAS = {
  premier: { slug: 'eng.1', nombre: 'Premier League', emoji: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', alias: ['inglaterra', 'epl', 'eng'] },
  laliga: { slug: 'esp.1', nombre: 'LaLiga', emoji: '🇪🇸', alias: ['españa', 'espana', 'esp'] },
  seriea: { slug: 'ita.1', nombre: 'Serie A', emoji: '🇮🇹', alias: ['italia', 'ita'] },
  bundesliga: { slug: 'ger.1', nombre: 'Bundesliga', emoji: '🇩🇪', alias: ['alemania', 'ger'] },
  ligue1: { slug: 'fra.1', nombre: 'Ligue 1', emoji: '🇫🇷', alias: ['francia', 'fra'] },
  champions: { slug: 'uefa.champions', nombre: 'Champions League', emoji: '🏆', alias: ['ucl', 'uefa'] },
  europa: { slug: 'uefa.europa', nombre: 'Europa League', emoji: '🥈', alias: ['uel'] },
  libertadores: { slug: 'conmebol.libertadores', nombre: 'Copa Libertadores', emoji: '🏆', alias: ['copalibertadores', 'lib'] },
  sudamericana: { slug: 'conmebol.sudamericana', nombre: 'Copa Sudamericana', emoji: '🥈', alias: ['copasudamericana', 'sula'] },
  liga1: { slug: 'per.1', nombre: 'Liga 1 Perú', emoji: '🇵🇪', alias: ['peru', 'per', 'ligaperuana'] },
  argentina: { slug: 'arg.1', nombre: 'Liga Argentina', emoji: '🇦🇷', alias: ['arg', 'ligaargentina'] },
  brasil: { slug: 'bra.1', nombre: 'Brasileirão', emoji: '🇧🇷', alias: ['bra', 'brasileirao'] },
  colombia: { slug: 'col.1', nombre: 'Liga Colombiana', emoji: '🇨🇴', alias: ['col'] },
  chile: { slug: 'chi.1', nombre: 'Liga Chilena', emoji: '🇨🇱', alias: ['chi'] },
  ecuador: { slug: 'ecu.1', nombre: 'Liga Ecuatoriana', emoji: '🇪🇨', alias: ['ecu'] },
  uruguay: { slug: 'uru.1', nombre: 'Liga Uruguaya', emoji: '🇺🇾', alias: ['uru'] },
  mexico: { slug: 'mex.1', nombre: 'Liga MX', emoji: '🇲🇽', alias: ['ligamx', 'mex'] },
  mls: { slug: 'usa.1', nombre: 'MLS', emoji: '🇺🇸', alias: ['usa', 'estadosunidos'] },
  mundial: { slug: 'fifa.world', nombre: 'Mundial', emoji: '🌍', alias: ['worldcup', 'copadelmundo'] },
  eliminatorias: { slug: 'fifa.worldq.conmebol', nombre: 'Eliminatorias Sudamericanas', emoji: '🌎', alias: ['elim', 'conmebol'] },
}
// Las que se consultan juntas cuando no se indica liga.
const LIGAS_PRINCIPALES = ['premier', 'laliga', 'seriea', 'bundesliga', 'champions', 'libertadores', 'liga1', 'eliminatorias']

const sinAcentos = (t) => String(t || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]/g, '')

/** "Premier", "ucl", "liga 1" → clave de LIGAS (o null). */
function resolverLiga(texto) {
  const t = sinAcentos(texto)
  if (!t) return null
  for (const [clave, l] of Object.entries(LIGAS)) {
    if (t === clave || l.alias.map(sinAcentos).includes(t) || sinAcentos(l.nombre) === t) return clave
  }
  return null
}

// ── Red ───────────────────────────────────────────────────────────────
const cache = new Map()
const _limpiarCache = () => cache.clear()

async function pedirJSON(url) {
  const guardado = cache.get(url)
  if (guardado && Date.now() - guardado.ts < TTL_CACHE_MS) return guardado.data
  const data = await reintentar(async () => {
    const resp = await fetchSeguro(url, { headers: { Accept: 'application/json', 'User-Agent': 'Mozilla/5.0' } })
    if (resp.status === 404) return null // liga sin datos
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`)
    return resp.json()
  }, { intentos: 2, esperaMs: 1000 })
  cache.set(url, { ts: Date.now(), data })
  if (cache.size > 200) cache.delete(cache.keys().next().value)
  return data
}

const fechaAPI = (ts) => claveDia(ts).replace(/-/g, '')

// ── Normalización de partidos ─────────────────────────────────────────
function estadoDe(status) {
  const nombre = String(status?.type?.name || '')
  const estado = status?.type?.state
  if (/POSTPONED|CANCELED|CANCELLED|SUSPENDED|ABANDONED|DELAYED|FORFEIT/i.test(nombre)) return 'suspendido'
  if (/HALFTIME/i.test(nombre)) return 'descanso'
  if (estado === 'in') return 'vivo'
  if (estado === 'post') return 'final'
  return 'pre'
}

function numeroGoles(valor) {
  const n = Number(valor)
  return Number.isFinite(n) ? n : null
}

function normalizarEvento(ev, slug, ligaNombre) {
  const comp = ev?.competitions?.[0]
  const equipos = comp?.competitors || []
  const local = equipos.find((c) => c.homeAway === 'home') || equipos[0]
  const visita = equipos.find((c) => c.homeAway === 'away') || equipos[1]
  if (!local || !visita) return null
  const lado = (c) => ({
    id: String(c.team?.id ?? c.id ?? ''),
    nombre: c.team?.displayName || c.team?.name || '¿?',
    abrev: c.team?.abbreviation || '',
    goles: numeroGoles(c.score),
  })
  const l = lado(local)
  const v = lado(visita)
  const ladoDeEquipo = (teamId) => (String(teamId) === l.id ? 'local' : 'visita')

  const detalles = Array.isArray(comp.details) ? comp.details : []
  const jugador = (d) => d.athletesInvolved?.[0]?.displayName || d.athletesInvolved?.[0]?.shortName || ''
  const minuto = (d) => d.clock?.displayValue || ''
  const goles = detalles.filter((d) => d.scoringPlay).map((d) => ({
    min: minuto(d), jugador: jugador(d), lado: ladoDeEquipo(d.team?.id), penal: Boolean(d.penaltyKick), autogol: Boolean(d.ownGoal),
  }))
  const rojas = detalles.filter((d) => d.redCard).map((d) => ({ min: minuto(d), jugador: jugador(d), lado: ladoDeEquipo(d.team?.id) }))

  return {
    id: String(ev.id), slug, liga: ligaNombre, fecha: Date.parse(ev.date) || 0,
    estado: estadoDe(ev.status),
    reloj: ev.status?.displayClock || ev.status?.type?.shortDetail || '',
    detalle: ev.status?.type?.detail || '',
    local: l, visita: v, goles, rojas, estadio: comp.venue?.fullName || '',
  }
}

/** Partidos de una liga entre dos fechas (timestamps); null si ESPN no tiene esa liga. */
async function obtenerPartidos(clave, { desde = Date.now(), hasta = desde + DIA_MS } = {}) {
  const liga = LIGAS[clave]
  if (!liga) throw new Error('Liga no válida.')
  const data = await pedirJSON(`${BASE_SITE}/${liga.slug}/scoreboard?dates=${fechaAPI(desde)}-${fechaAPI(hasta)}&limit=200`)
  if (!data) return null
  return (data.events || []).map((e) => normalizarEvento(e, liga.slug, liga.nombre)).filter(Boolean)
}

/** Solo los partidos que caen en el día de hoy (hora de Perú). */
async function partidosDeHoy(clave, ahora = Date.now()) {
  const todos = await obtenerPartidos(clave, { desde: ahora - DIA_MS, hasta: ahora + DIA_MS })
  if (!todos) return null
  const hoy = claveDia(ahora)
  return todos.filter((p) => claveDia(p.fecha) === hoy || p.estado === 'vivo' || p.estado === 'descanso')
}

/** Consulta varias ligas a la vez; las que fallan se ignoran. */
async function variasLigas(claves, obtener) {
  const resultados = await Promise.allSettled(claves.map((c) => obtener(c)))
  return resultados
    .map((r, i) => (r.status === 'fulfilled' && r.value?.length ? { clave: claves[i], liga: LIGAS[claves[i]], partidos: r.value } : null))
    .filter(Boolean)
}

async function obtenerTabla(clave) {
  const liga = LIGAS[clave]
  if (!liga) throw new Error('Liga no válida.')
  const data = await pedirJSON(`${BASE_V2}/${liga.slug}/standings`)
  if (!data) return null
  const grupos = data.children?.length ? data.children : [data]
  return grupos.map((g) => {
    const stat = (e, nombre) => Number(e.stats?.find((s) => s.name === nombre)?.value ?? 0)
    const filas = (g.standings?.entries || []).map((e, i) => ({
      pos: stat(e, 'rank') || i + 1,
      equipo: e.team?.displayName || e.team?.name || '¿?',
      pj: stat(e, 'gamesPlayed'), g: stat(e, 'wins'), e: stat(e, 'ties'), p: stat(e, 'losses'),
      dg: stat(e, 'pointDifferential'), pts: stat(e, 'points'),
    })).sort((a, b) => a.pos - b.pos)
    return { grupo: g.name || '', filas }
  }).filter((g) => g.filas.length)
}

/** ¿El nombre/abreviatura del equipo coincide con lo que escribió la persona? */
function coincideEquipo(equipo, texto) {
  const t = sinAcentos(texto)
  if (t.length < 3) return false
  return [equipo.nombre, equipo.abrev].some((n) => {
    const s = sinAcentos(n)
    return s && (s.includes(t) || (t.length >= 4 && t.includes(s)))
  })
}
const partidoDe = (partido, texto) => coincideEquipo(partido.local, texto) || coincideEquipo(partido.visita, texto)

/** Busca el equipo en todas las ligas (hoy y próximos 7 días). */
async function buscarEquipo(texto, ahora = Date.now()) {
  const grupos = await variasLigas(Object.keys(LIGAS), (c) => obtenerPartidos(c, { desde: ahora - DIA_MS, hasta: ahora + 7 * DIA_MS }))
  const encontrados = []
  for (const g of grupos) for (const p of g.partidos) if (partidoDe(p, texto)) encontrados.push({ ...p, clave: g.clave })
  if (!encontrados.length) return null
  encontrados.sort((a, b) => a.fecha - b.fecha)
  const primero = encontrados[0]
  const equipo = coincideEquipo(primero.local, texto) ? primero.local : primero.visita
  return { nombre: equipo.nombre, claves: [...new Set(encontrados.map((p) => p.clave))], partidos: encontrados }
}

// ── Texto ─────────────────────────────────────────────────────────────
const hora = (ts) => {
  const p = new Date(ts - OFFSET_HORAS * 3600000)
  return `${String(p.getUTCHours()).padStart(2, '0')}:${String(p.getUTCMinutes()).padStart(2, '0')}`
}
const diaCorto = (ts) => {
  const p = new Date(ts - OFFSET_HORAS * 3600000)
  return `${String(p.getUTCDate()).padStart(2, '0')}/${String(p.getUTCMonth() + 1).padStart(2, '0')}`
}

function lineaPartido(p, { conDia = false } = {}) {
  const gl = p.local.goles ?? 0
  const gv = p.visita.goles ?? 0
  switch (p.estado) {
    case 'vivo': return `🔴 ${p.reloj || 'EN VIVO'}  ${p.local.nombre} *${gl} - ${gv}* ${p.visita.nombre}`
    case 'descanso': return `⏸️ DESCANSO  ${p.local.nombre} *${gl} - ${gv}* ${p.visita.nombre}`
    case 'final': return `🏁 FT  ${p.local.nombre} *${gl} - ${gv}* ${p.visita.nombre}`
    case 'suspendido': return `⚠️ ${p.detalle || 'Suspendido'}  ${p.local.nombre} vs ${p.visita.nombre}`
    default: return `🕒 ${conDia ? `${diaCorto(p.fecha)} ` : ''}${hora(p.fecha)}  ${p.local.nombre} vs ${p.visita.nombre}`
  }
}

const ORDEN_ESTADO = { vivo: 0, descanso: 0, pre: 1, final: 2, suspendido: 3 }
const ordenarPartidos = (lista) => [...lista].sort((a, b) => ORDEN_ESTADO[a.estado] - ORDEN_ESTADO[b.estado] || a.fecha - b.fecha)

function textoGrupos(grupos, opciones = {}) {
  const filas = []
  for (const g of grupos) {
    if (filas.length) filas.push('')
    filas.push(`*${g.liga.emoji} ${g.liga.nombre}*`)
    for (const p of ordenarPartidos(g.partidos)) filas.push(lineaPartido(p, opciones))
  }
  return filas
}

function textoTabla(grupos, limite = 20) {
  const filas = []
  for (const g of grupos) {
    if (g.grupo && grupos.length > 1) filas.push(`*${g.grupo}*`)
    filas.push('`#  Equipo            PJ  DG  PTS`')
    for (const f of g.filas.slice(0, limite)) {
      const nombre = f.equipo.length > 15 ? `${f.equipo.slice(0, 14)}…` : f.equipo
      const dg = f.dg > 0 ? `+${f.dg}` : String(f.dg)
      filas.push(`\`${String(f.pos).padEnd(2)} ${nombre.padEnd(16)} ${String(f.pj).padStart(2)} ${dg.padStart(3)} ${String(f.pts).padStart(3)}\``)
    }
  }
  return filas
}

function textoDetallePartido(p) {
  const filas = [lineaPartido(p, { conDia: true })]
  if (p.estadio) filas.push(`🏟️ ${p.estadio}`)
  if (p.goles.length) {
    filas.push('', '*⚽ Goles*')
    for (const g of p.goles) {
      const quien = g.lado === 'local' ? p.local.nombre : p.visita.nombre
      filas.push(`${g.min}  ${g.jugador || 'Gol'}${g.penal ? ' (p)' : ''}${g.autogol ? ' (en contra)' : ''} — ${quien}`)
    }
  }
  if (p.rojas.length) {
    filas.push('', '*🟥 Expulsiones*')
    for (const r of p.rojas) filas.push(`${r.min}  ${r.jugador || 'Jugador'} — ${r.lado === 'local' ? p.local.nombre : p.visita.nombre}`)
  }
  return filas
}

module.exports = {
  LIGAS, LIGAS_PRINCIPALES, resolverLiga, normalizarEvento, obtenerPartidos, partidosDeHoy, variasLigas,
  obtenerTabla, buscarEquipo, coincideEquipo, partidoDe, lineaPartido, ordenarPartidos, textoGrupos,
  textoTabla, textoDetallePartido, sinAcentos, hora, _limpiarCache,
}
