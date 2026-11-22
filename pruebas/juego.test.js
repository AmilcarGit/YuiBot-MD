import test from 'node:test'
import assert from 'node:assert/strict'
import { ganarXp, tirar, logro, rarezas } from '../nucleo/juego.js'
import { tiempo, soloNumero } from '../nucleo/utiles.js'

const nuevo = () => ({ xp: 0, nivel: 1, logros: [] })

test('ganarXp sube de nivel y nunca lo baja', () => {
  const u = nuevo()
  assert.equal(ganarXp(u, 5), false)
  assert.equal(ganarXp(u, 100), true)
  assert.ok(u.nivel > 1)
  const alcanzado = u.nivel
  ganarXp(u, 0)
  assert.equal(u.nivel, alcanzado)
})

test('el logro de nivel 10 se otorga una sola vez', () => {
  const u = nuevo()
  ganarXp(u, 20 * 81)
  assert.ok(u.logros.includes('nivel10'))
  assert.equal(logro(u, 'nivel10'), false)
  assert.equal(u.logros.filter(l => l === 'nivel10').length, 1)
})

test('tirar siempre devuelve un personaje de su rareza', () => {
  for (let i = 0; i < 500; i++) {
    const { rareza, personaje } = tirar(i % 2 === 0)
    const grupo = rarezas.find(r => r.nombre === rareza)
    assert.ok(grupo.personajes.includes(personaje))
  }
})

test('tiempo y soloNumero', () => {
  assert.equal(tiempo(90000), '1m 30s')
  assert.equal(tiempo(3600000), '1h')
  assert.equal(soloNumero('51910227479:12@s.whatsapp.net'), '51910227479')
  assert.equal(soloNumero('123@lid'), '123')
})
