// Código Oficial de YuiBot-MD.by AmilcarGit
import test from 'node:test'
import assert from 'node:assert/strict'
import clima from '../habilidades/general/clima.js'
import { tiempoDe, nombreDia } from '../nucleo/clima.js'

const geo = { results: [{ name: 'Lima', admin1: 'Lima', country: 'Perú', country_code: 'PE', latitude: -12.04, longitude: -77.03 }] }
const pron = {
  current: { time: '2026-11-25T06:00', temperature_2m: 19.4, apparent_temperature: 19.8, relative_humidity_2m: 84, wind_speed_10m: 11.2, precipitation: 0, weather_code: 3, is_day: 1 },
  daily: { time: ['2026-11-25', '2026-11-26', '2026-11-27', '2026-11-28'], weather_code: [3, 61, 0, 2], temperature_2m_max: [22, 21, 24, 23], temperature_2m_min: [17, 16, 18, 17], precipitation_probability_max: [10, 70, 0, 5], uv_index_max: [9, 4, 10, 8] }
}

async function correr(args, fetchFalso) {
  const original = globalThis.fetch; globalThis.fetch = fetchFalso
  const salida = []
  try { await clima.ejecutar({}, {}, { args, prefijo: '.', responder: t => salida.push(t) }) } finally { globalThis.fetch = original }
  return salida
}
const json = datos => ({ ok: true, json: async () => datos })

test('tiempoDe traduce códigos y día/noche', () => {
  assert.deepEqual(tiempoDe(0, true), { texto: 'Despejado', emoji: '☀️' })
  assert.equal(tiempoDe(0, false).emoji, '🌙')
  assert.equal(tiempoDe(999).texto, 'Variable')
  assert.equal(nombreDia('2026-11-25'), 'mié')
})

test('.clima muestra ciudad, temperatura y pronóstico', async () => {
  const salida = await correr(['Lima'], async url => json(String(url).includes('geocoding') ? geo : pron))
  assert.match(salida[0], /Lima, Perú/)
  assert.match(salida[0], /19°C/)
  assert.match(salida[0], /jue 26: 16°C \/ 21°C · 70%/)
  assert.match(salida[0], /protector solar/)
})

test('.clima sin ciudad o con ciudad inexistente explica qué hacer', async () => {
  assert.match((await correr([], async () => assert.fail()))[0], /Dime la ciudad/)
  assert.match((await correr(['Zzzz'], async () => json({})))[0], /No encontré/)
})

test('.clima responde con calma si el servicio falla', async () => {
  const salida = await correr(['Lima'], async () => ({ ok: false, status: 500 }))
  assert.match(salida[0], /No pude consultar el clima/)
})
