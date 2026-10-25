// Clientes de APIs públicas gratuitas y sin key (PokeAPI, Jikan, Frankfurter,
// CoinGecko, REST Countries). Cada función devuelve datos ya normalizados.
const fetch = require('./http').fetchSeguro
const { reintentar } = require('./reintentar')

async function pedirJson(url) {
  return reintentar(async () => {
    const resp = await fetch(url, { headers: { 'User-Agent': 'YuiBot-MD', Accept: 'application/json' } })
    if (resp.status === 404) throw Object.assign(new Error('No encontrado'), { noEncontrado: true })
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`)
    return resp.json()
  }, { debeReintentar: (e) => !e.noEncontrado && /HTTP 5\d\d|HTTP 429|fetch failed|timeout|ENOTFOUND|ECONN|ETIMEDOUT/i.test(`${e.message} ${e.cause?.code || ''}`) })
}

const mayus = (t) => String(t || '').replace(/(^|[-\s])(\w)/g, (_, a, b) => a.replace('-', ' ') + b.toUpperCase())

// ── Pokémon ──
async function pokemon(nombre) {
  const limpio = String(nombre).trim().toLowerCase().replace(/\s+/g, '-')
  const d = await pedirJson(`https://pokeapi.co/api/v2/pokemon/${encodeURIComponent(limpio)}`)
  const stats = Object.fromEntries((d.stats || []).map((s) => [s.stat.name, s.base_stat]))
  return {
    id: d.id,
    nombre: mayus(d.name),
    tipos: (d.types || []).map((t) => mayus(t.type.name)),
    habilidades: (d.abilities || []).map((a) => mayus(a.ability.name)),
    altura: d.height / 10, // m
    peso: d.weight / 10, // kg
    stats: { hp: stats.hp, ataque: stats.attack, defensa: stats.defense, velocidad: stats.speed, ataqueEsp: stats['special-attack'], defensaEsp: stats['special-defense'] },
    imagen: d.sprites?.other?.['official-artwork']?.front_default || d.sprites?.front_default || null,
  }
}

// ── Anime (MyAnimeList vía Jikan) ──
async function anime(consulta) {
  const d = await pedirJson(`https://api.jikan.moe/v4/anime?q=${encodeURIComponent(consulta)}&limit=1&sfw=true`)
  const a = d?.data?.[0]
  if (!a) throw Object.assign(new Error('No encontrado'), { noEncontrado: true })
  return {
    titulo: a.title_english || a.title,
    tituloOriginal: a.title,
    tipo: a.type,
    episodios: a.episodes,
    estado: a.status,
    anio: a.year || a.aired?.prop?.from?.year || null,
    puntuacion: a.score,
    ranking: a.rank,
    generos: (a.genres || []).map((g) => g.name),
    sinopsis: String(a.synopsis || '').replace(/\s*\[Written by MAL Rewrite\]\s*/i, '').trim(),
    imagen: a.images?.jpg?.large_image_url || a.images?.jpg?.image_url || null,
    url: a.url,
  }
}

// ── Divisas (Frankfurter) ──
async function divisa(monto, de, a) {
  const d = await pedirJson(`https://api.frankfurter.app/latest?amount=${encodeURIComponent(monto)}&from=${encodeURIComponent(de)}&to=${encodeURIComponent(a)}`)
  const resultado = d?.rates?.[a]
  if (typeof resultado !== 'number') throw Object.assign(new Error('No encontrado'), { noEncontrado: true })
  return { monto, de, a, resultado, fecha: d.date }
}

// ── Criptomonedas (CoinGecko) ──
const CRIPTOS = { btc: 'bitcoin', eth: 'ethereum', bnb: 'binancecoin', sol: 'solana', xrp: 'ripple', ada: 'cardano', doge: 'dogecoin', dot: 'polkadot', ltc: 'litecoin', trx: 'tron', usdt: 'tether', matic: 'matic-network' }

async function cripto(simbolo) {
  const buscado = String(simbolo).trim().toLowerCase()
  const id = CRIPTOS[buscado] || buscado
  const d = await pedirJson(`https://api.coingecko.com/api/v3/simple/price?ids=${encodeURIComponent(id)}&vs_currencies=usd,pen&include_24hr_change=true`)
  const c = d?.[id]
  if (!c || typeof c.usd !== 'number') throw Object.assign(new Error('No encontrado'), { noEncontrado: true })
  return { id, usd: c.usd, pen: c.pen, cambio24h: c.usd_24h_change }
}

// ── Países (REST Countries) ──
async function pais(nombre) {
  const campos = 'name,translations,capital,population,region,subregion,flags,currencies,languages,area'
  const d = await pedirJson(`https://restcountries.com/v3.1/name/${encodeURIComponent(nombre)}?fields=${campos}`)
  const p = Array.isArray(d) ? d[0] : null
  if (!p) throw Object.assign(new Error('No encontrado'), { noEncontrado: true })
  return {
    nombre: p.translations?.spa?.common || p.name?.common,
    oficial: p.translations?.spa?.official || p.name?.official,
    capital: (p.capital || []).join(', '),
    poblacion: p.population,
    region: [p.region, p.subregion].filter(Boolean).join(' · '),
    area: p.area,
    monedas: Object.values(p.currencies || {}).map((m) => `${m.name}${m.symbol ? ` (${m.symbol})` : ''}`),
    idiomas: Object.values(p.languages || {}),
    bandera: p.flags?.png || null,
  }
}

module.exports = { pokemon, anime, divisa, cripto, pais, _internos: { mayus, CRIPTOS } }
