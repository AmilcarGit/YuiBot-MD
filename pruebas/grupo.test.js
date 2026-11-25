// Código Oficial de YuiBot-MD.by AmilcarGit
import test from 'node:test'
import assert from 'node:assert/strict'
import kick from '../habilidades/grupo/kick.js'
import { objetivos } from '../habilidades/grupo/_comun.js'

const ctxFalso = (enviados, respuestas) => ({ jid: 'g@g.us', prefijo: '.', responder: t => respuestas.push(t), enviar: c => enviados.push(c) })

test('objetivos junta menciones y mensaje citado', () => {
  const m = { message: { extendedTextMessage: { contextInfo: { mentionedJid: ['1@s.whatsapp.net'], participant: '2@s.whatsapp.net' } } } }
  assert.deepEqual(objetivos(m).sort(), ['1@s.whatsapp.net', '2@s.whatsapp.net'])
})

test('kick expulsa a un miembro pero no a un admin', async () => {
  const llamadas = []
  const sock = {
    user: { id: '999:1@s.whatsapp.net' },
    groupMetadata: async () => ({ participants: [{ id: '999@s.whatsapp.net', admin: 'admin' }, { id: '1@s.whatsapp.net' }, { id: '2@s.whatsapp.net', admin: 'admin' }] }),
    groupParticipantsUpdate: async (...a) => llamadas.push(a)
  }
  const enviados = []; const respuestas = []
  const m = { message: { extendedTextMessage: { contextInfo: { mentionedJid: ['1@s.whatsapp.net', '2@s.whatsapp.net'] } } } }
  await kick.ejecutar(sock, m, { ...ctxFalso(enviados, respuestas), m })
  assert.deepEqual(llamadas, [['g@g.us', ['1@s.whatsapp.net'], 'remove']])
})

test('kick avisa si el bot no es admin', async () => {
  const respuestas = []
  const sock = { user: { id: '999@s.whatsapp.net' }, groupMetadata: async () => ({ participants: [{ id: '1@s.whatsapp.net' }] }), groupParticipantsUpdate: async () => assert.fail('no debía expulsar') }
  const m = { message: { extendedTextMessage: { contextInfo: { mentionedJid: ['1@s.whatsapp.net'] } } } }
  await kick.ejecutar(sock, m, { ...ctxFalso([], respuestas), m })
  assert.match(respuestas[0], /admin/)
})
