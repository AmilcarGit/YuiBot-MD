// Permisos de comandos: regresión del fallo en que cualquier usuario pasaba
// los chequeos de owner/dueño dentro de un subbot (Fase A).
const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('fs')
const path = require('path')
const { RAIZ, respaldar } = require('./_util')

const { evaluarPermiso } = require('../lib/permisos')
const { obtenerCandidatosPropietario } = require('../lib/handler')
const config = require('../defaults')

const SUBBOT = '51999111222'
const DUENO_SUBBOT = '51955000111'
const DESCONOCIDO = '51999888777'
const OWNER = config.OWNERS[0].numero
const GRUPO = '120363000@g.us'

const carpetaSubbot = path.join(RAIZ, 'subbots', SUBBOT)
let restaurar

test.before(() => {
  restaurar = respaldar([carpetaSubbot])
  fs.mkdirSync(carpetaSubbot, { recursive: true })
  fs.writeFileSync(path.join(carpetaSubbot, 'datos.json'), JSON.stringify({ dueno: { numero: DUENO_SUBBOT } }))
})
test.after(() => restaurar())

const sockSubbot = { user: { id: `${SUBBOT}:7@s.whatsapp.net`, lid: '123456789:7@lid' } }
const sockPrincipal = { user: { id: `${OWNER}:3@s.whatsapp.net` } }
const de = (numero) => ({ key: { remoteJid: GRUPO, participant: `${numero}@s.whatsapp.net`, fromMe: false } })
const propio = { key: { remoteJid: GRUPO, fromMe: true } }
const enSubbot = { esSubBot: true, subbotNumero: SUBBOT }

const soloOwner = { ownerOnly: true }
const soloDueno = { subbotOwnerOnly: true }

test('la identidad del propio bot NO cuenta como remitente si el mensaje no es fromMe', () => {
  const candidatos = obtenerCandidatosPropietario(sockSubbot, de(DESCONOCIDO))
  assert.ok(!candidatos.some((jid) => jid.startsWith(SUBBOT)), 'el número del subbot no debe aparecer como remitente')
})

test('subbot: un desconocido no puede usar comandos ownerOnly (eval/exec)', () => {
  assert.equal(evaluarPermiso(soloOwner, { sock: sockSubbot, msg: de(DESCONOCIDO), config, ...enSubbot }).permitido, false)
})

test('subbot: un desconocido no puede usar comandos de dueño de subbot', () => {
  const r = evaluarPermiso(soloDueno, { sock: sockSubbot, msg: de(DESCONOCIDO), config, ...enSubbot })
  assert.equal(r.permitido, false)
  assert.equal(r.motivo, 'dueno_subbot')
})

test('subbot: el dueño registrado usa sus comandos pero NO los ownerOnly', () => {
  assert.equal(evaluarPermiso(soloDueno, { sock: sockSubbot, msg: de(DUENO_SUBBOT), config, ...enSubbot }).permitido, true)
  assert.equal(evaluarPermiso(soloOwner, { sock: sockSubbot, msg: de(DUENO_SUBBOT), config, ...enSubbot }).permitido, false)
})

test('subbot: el owner del bot principal puede usar ownerOnly', () => {
  assert.equal(evaluarPermiso(soloOwner, { sock: sockSubbot, msg: de(OWNER), config, ...enSubbot }).permitido, true)
})

test('subbot: la propia cuenta del subbot (fromMe) es su dueña pero no owner del bot', () => {
  assert.equal(evaluarPermiso(soloDueno, { sock: sockSubbot, msg: propio, config, ...enSubbot }).permitido, true)
  assert.equal(evaluarPermiso(soloOwner, { sock: sockSubbot, msg: propio, config, ...enSubbot }).permitido, false)
})

test('comandos sin restricción los puede usar cualquiera', () => {
  assert.equal(evaluarPermiso({}, { sock: sockSubbot, msg: de(DESCONOCIDO), config, ...enSubbot }).permitido, true)
})

test('principal vinculado a un número de owner: un desconocido sigue sin pasar', () => {
  assert.equal(evaluarPermiso(soloOwner, { sock: sockPrincipal, msg: de(DESCONOCIDO), config }).permitido, false)
})

test('principal: un owner real y la propia cuenta del bot sí pasan', () => {
  const otroOwner = config.OWNERS[1].numero
  assert.equal(evaluarPermiso(soloOwner, { sock: sockPrincipal, msg: de(otroOwner), config }).permitido, true)
  const propioPrivado = { key: { remoteJid: `${OWNER}@s.whatsapp.net`, fromMe: true } }
  assert.equal(evaluarPermiso(soloOwner, { sock: sockPrincipal, msg: propioPrivado, config }).permitido, true)
})
