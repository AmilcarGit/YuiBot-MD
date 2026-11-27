// Código Oficial de YuiBot-MD.by AmilcarGit
// Clima con Open-Meteo (gratis y sin clave): busca la ciudad y trae el tiempo actual y los próximos días.
const GEO = 'https://geocoding-api.open-meteo.com/v1/search'
const PRONOSTICO = 'https://api.open-meteo.com/v1/forecast'

// Códigos del tiempo (WMO) → descripción y emoji.
const CODIGOS = [
  [[0], 'Despejado', '☀️', '🌙'], [[1], 'Casi despejado', '🌤️', '🌙'], [[2], 'Parcialmente nublado', '⛅', '☁️'], [[3], 'Nublado', '☁️'],
  [[45, 48], 'Niebla', '🌫️'], [[51, 53, 55], 'Llovizna', '🌦️'], [[56, 57], 'Llovizna helada', '🌧️'],
  [[61, 63], 'Lluvia', '🌧️'], [[65], 'Lluvia fuerte', '🌧️'], [[66, 67], 'Lluvia helada', '🌧️'],
  [[71, 73, 75, 77], 'Nieve', '❄️'], [[80, 81], 'Chubascos', '🌦️'], [[82], 'Chubascos fuertes', '⛈️'],
  [[85, 86], 'Nevada', '🌨️'], [[95], 'Tormenta', '⛈️'], [[96, 99], 'Tormenta con granizo', '⛈️']
]
export function tiempoDe(codigo, dia = true) {
  const f = CODIGOS.find(c => c[0].includes(Number(codigo)))
  return f ? { texto: f[1], emoji: dia ? f[2] : (f[3] || f[2]) } : { texto: 'Variable', emoji: '🌡️' }
}

const DIAS = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb']
export const nombreDia = fecha => DIAS[new Date(`${fecha}T12:00:00Z`).getUTCDay()]

async function pedir(url, params, ms = 9000) {
  const u = new URL(url)
  for (const [k, v] of Object.entries(params)) u.searchParams.set(k, v)
  const respuesta = await fetch(u, { signal: AbortSignal.timeout(ms) })
  if (!respuesta.ok) throw new Error(`El servicio del clima respondió ${respuesta.status}`)
  return respuesta.json()
}

/** Busca una ciudad por nombre ("Lima", "Madrid, España"). Devuelve null si no existe. */
export async function buscarCiudad(nombre) {
  const [ciudad, ...resto] = String(nombre).split(',').map(x => x.trim()).filter(Boolean)
  const datos = await pedir(GEO, { name: ciudad, count: 5, language: 'es', format: 'json' })
  const lista = datos.results || []
  if (!lista.length) return null
  const pais = resto.join(' ').toLowerCase()
  const elegida = (pais && lista.find(r => [r.country, r.country_code, r.admin1].some(x => x && x.toLowerCase().includes(pais)))) || lista[0]
  return { nombre: elegida.name, region: elegida.admin1 || '', pais: elegida.country || '', zona: elegida.timezone || '', lat: elegida.latitude, lon: elegida.longitude }
}

/** Tiempo actual y pronóstico de 3 días para unas coordenadas. */
export async function obtenerClima(lat, lon) {
  const d = await pedir(PRONOSTICO, {
    latitude: lat, longitude: lon, timezone: 'auto', forecast_days: 4, wind_speed_unit: 'kmh',
    current: 'temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m,is_day',
    daily: 'weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,uv_index_max'
  })
  if (!d.current || !d.daily) throw new Error('El servicio del clima no devolvió datos')
  const c = d.current
  const dias = d.daily.time.map((fecha, i) => ({
    fecha, codigo: d.daily.weather_code[i], max: d.daily.temperature_2m_max[i], min: d.daily.temperature_2m_min[i],
    lluvia: d.daily.precipitation_probability_max?.[i] ?? null, uv: d.daily.uv_index_max?.[i] ?? null
  }))
  return {
    temp: c.temperature_2m, sensacion: c.apparent_temperature, humedad: c.relative_humidity_2m, viento: c.wind_speed_10m,
    lluviaMm: c.precipitation, codigo: c.weather_code, dia: c.is_day !== 0, hora: String(c.time || '').slice(11, 16), dias
  }
}

const uvTexto = uv => (uv == null ? '' : uv >= 11 ? 'extremo' : uv >= 8 ? 'muy alto' : uv >= 6 ? 'alto' : uv >= 3 ? 'moderado' : 'bajo')
const grados = n => `${Math.round(n)}°C`

export function consejo(c) {
  const hoy = c.dias[0]
  if ([95, 96, 99, 82].includes(c.codigo)) return 'Hay tormenta: mejor quédate en un lugar seguro.'
  if ((hoy.lluvia ?? 0) >= 50 || [51, 53, 55, 61, 63, 65, 80, 81].includes(c.codigo)) return 'Lleva paraguas, hay buena chance de lluvia ☔'
  if ((hoy.uv ?? 0) >= 8) return 'El sol está fuerte: usa protector solar 🧴'
  if (c.temp >= 30) return 'Hace calor: tómate un buen vaso de agua 💧'
  if (c.temp <= 12) return 'Hace frío: abrígate bien 🧣'
  return 'Está agradable, ¡aprovecha el día! 🌸'
}

export function resumen(ciudad, c) {
  const t = tiempoDe(c.codigo, c.dia)
  const hoy = c.dias[0]
  const lugar = [ciudad.nombre, ciudad.region !== ciudad.nombre && ciudad.region, ciudad.pais].filter(Boolean).join(', ')
  const lineas = [
    `📍 ${lugar}`,
    `${t.emoji} ${t.texto} · ${grados(c.temp)} (sensación ${grados(c.sensacion)})`,
    `💧 Humedad ${Math.round(c.humedad)}% · 🌬️ Viento ${Math.round(c.viento)} km/h`,
    `🌡️ Hoy: ${grados(hoy.min)} a ${grados(hoy.max)}${hoy.lluvia != null ? ` · 🌧️ ${Math.round(hoy.lluvia)}% de lluvia` : ''}`,
    hoy.uv != null ? `🕶️ UV ${Math.round(hoy.uv)} (${uvTexto(hoy.uv)})` : null,
    '',
    ...c.dias.slice(1).map(d => `${tiempoDe(d.codigo).emoji} ${nombreDia(d.fecha)} ${d.fecha.slice(8)}: ${grados(d.min)} / ${grados(d.max)}${d.lluvia != null ? ` · ${Math.round(d.lluvia)}%🌧️` : ''}`),
    '',
    consejo(c)
  ]
  return lineas.filter(l => l !== null)
}
