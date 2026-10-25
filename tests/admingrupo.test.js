// Comandos de administración de grupos (cerrar, abrir, link, warn, hidetag…).
const test = require('node:test')
const assert = require('node:assert/strict')
const path = require('path')
const { respaldar } = require('./_util')

const restaurar = respaldar([path.join(__dirname, '..', 'data', 'grupos.json')])
test.after(() => restaurar())

const config = require('../defaults')
const GRUPO = '120363111@g.us'
const ADMIN = '51911111111', MIEMBRO = '51922222222', OTRO_ADMIN = '51933333333', BOT = '51900000000'

function crearSock({ botAdmin = true } = {}) {
  const llamadas = [], enviados = []
  return {
    llamadas, enviados,
    user: { id: `${BOT}:3@s.whatsapp.net` },
    groupMetadata: async () => ({ participants: [
      { id: `${ADMIN}@s.whatsapp.net`, admin: 'admin' },
      { id: `${OTRO_ADMIN}@s.whatsapp.net`, admin: 'admin' },
      { id: `${MIEMBRO}@s.whatsapp.net`, admin: null },
      { id: `${BOT}@s.whatsapp.net`, admin: botAdmin ? 'admin' : null },
    ] }),
    groupSettingUpdate: async (...a) => llamadas.push(['setting', ...a]),
    groupInviteCode: async () => 'CODIGO',
    groupRevokeInvite: async () => 'NUEVO',
    groupUpdateSubject: async (...a) => llamadas.push(['subject', ...a]),
    groupParticipantsUpdate: async (...a) => llamadas.push(['participants', ...a]),
    sendMessage: async (jid, c) => { enviados.push(c) },
  }
}
const msg = (quien, extra = {}) => ({ key: { remoteJid: GRUPO, participant: `${quien}@s.whatsapp.net` }, message: { extendedTextMessage: { contextInfo: extra } } })
const cmd = (n) => require(`../modulos/grupo/${n}`)

test('cerrar/abrir: solo admins y el bot debe ser admin', async () => {
  let s = crearSock()
  await cmd('cerrar').execute(s, msg(MIEMBRO), [], { config })
  assert.ok(s.enviados[0].text.includes('Solo los administradores'))
  assert.equal(s.llamadas.length, 0)

  s = crearSock({ botAdmin: false })
  await cmd('cerrar').execute(s, msg(ADMIN), [], { config })
  assert.ok(s.enviados[0].text.includes('Necesito ser administrador'))

  s = crearSock()
  await cmd('cerrar').execute(s, msg(ADMIN), [], { config })
  await cmd('abrir').execute(s, msg(ADMIN), [], { config })
  assert.deepEqual(s.llamadas.map((l) => l[2]), ['announcement', 'not_announcement'])
})

test('el owner del bot puede usar comandos de admin sin ser admin', async () => {
  const s = crearSock()
  await cmd('cerrar').execute(s, msg(config.OWNERS[0].numero), [], { config })
  assert.equal(s.llamadas.length, 1)
})

test('fuera de grupos se rechaza', async () => {
  const s = crearSock()
  await cmd('cerrar').execute(s, { key: { remoteJid: '51@s.whatsapp.net' }, message: {} }, [], { config })
  assert.ok(s.enviados[0].text.includes('solo funciona en grupos'))
})

test('linkgrupo devuelve el enlace y -r lo restablece', async () => {
  const s = crearSock()
  await cmd('linkgrupo').execute(s, msg(ADMIN), [], { config })
  await cmd('linkgrupo').execute(s, msg(ADMIN), ['-r'], { config })
  assert.ok(s.enviados[0].text.endsWith('/CODIGO'))
  assert.ok(s.enviados[1].text.endsWith('/NUEVO'))
})

test('nombregrupo valida longitud', async () => {
  const s = crearSock()
  await cmd('nombregrupo').execute(s, msg(ADMIN), ['x'.repeat(30)], { config })
  assert.ok(s.enviados[0].text.includes('25'))
  await cmd('nombregrupo').execute(s, msg(ADMIN), ['Los', 'Cracks'], { config })
  assert.deepEqual(s.llamadas[0], ['subject', GRUPO, 'Los Cracks'])
})

test('hidetag menciona a todos', async () => {
  const s = crearSock()
  await cmd('hidetag').execute(s, msg(ADMIN), ['hola'], { config })
  assert.equal(s.enviados[0].mentions.length, 4)
})

test('warn: suma, no toca admins y expulsa al llegar al máximo', async () => {
  const s = crearSock()
  const cita = { participant: `${MIEMBRO}@s.whatsapp.net` }
  await cmd('warn').execute(s, msg(ADMIN, cita), ['spam'], { config })
  assert.ok(s.enviados[0].text.includes('1/3'))
  await cmd('warn').execute(s, msg(ADMIN, cita), [], { config })
  assert.ok(s.enviados[1].text.includes('2/3'))
  await cmd('warns').execute(s, msg(ADMIN), [], { config })
  assert.ok(s.enviados[2].text.includes(MIEMBRO))
  await cmd('unwarn').execute(s, msg(ADMIN, cita), [], { config })
  assert.ok(s.enviados[3].text.includes('Le quedan 1'))
  await cmd('warn').execute(s, msg(ADMIN, cita), [], { config })
  await cmd('warn').execute(s, msg(ADMIN, cita), [], { config })
  assert.ok(s.enviados[5].text.includes('expulsado'))
  assert.deepEqual(s.llamadas.at(-1), ['participants', GRUPO, [`${MIEMBRO}@s.whatsapp.net`], 'remove'])
  await cmd('warns').execute(s, msg(ADMIN), [], { config })
  assert.ok(s.enviados.at(-1).text.includes('Nadie tiene'))

  await cmd('warn').execute(s, msg(ADMIN, { participant: `${OTRO_ADMIN}@s.whatsapp.net` }), [], { config })
  assert.ok(s.enviados.at(-1).text.includes('admin'))
})

test('warn exige objetivo y que sea miembro; miembros no pueden advertir', async () => {
  const s = crearSock()
  await cmd('warn').execute(s, msg(ADMIN), [], { config })
  assert.ok(s.enviados[0].text.includes('Cita o menciona'))
  await cmd('warn').execute(s, msg(ADMIN), ['51999999999'], { config })
  assert.ok(s.enviados[1].text.includes('no está en el grupo'))
  await cmd('warn').execute(s, msg(MIEMBRO), ['51922222222'], { config })
  assert.ok(s.enviados[2].text.includes('Solo los administradores'))
})

test('admins lista a los administradores', async () => {
  const s = crearSock()
  await cmd('admins').execute(s, msg(MIEMBRO), [], { config })
  assert.ok(s.enviados[0].text.includes('Admins (3)'))
})
