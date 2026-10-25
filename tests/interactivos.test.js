// .encuesta, .evento, .contacto, .ubicacion y el álbum real (enviarAlbum).
const test = require('node:test')
const assert = require('node:assert/strict')

const encuesta = require('../modulos/utilidad/encuesta')
const evento = require('../modulos/utilidad/evento')
const contacto = require('../modulos/utilidad/contacto')
const ubicacion = require('../modulos/utilidad/ubicacion')
const { enviarAlbum } = require('../lib/whatsapp/interactivos')
const config = require('../defaults')

function crearSock(opciones = {}) {
  const enviados = []
  return {
    enviados,
    async sendMessage(jid, contenido, extra) {
      if (opciones.fallarAlbum && contenido.album) throw new Error('sin álbum')
      enviados.push({ jid, contenido, extra })
      return { key: { id: `K${enviados.length}`, remoteJid: jid } }
    },
  }
}
const MSG = (message = {}) => ({ key: { remoteJid: '1@g.us', participant: '51111@s.whatsapp.net' }, message })

test('encuesta: interpreta pregunta y opciones, -m permite varias', () => {
  const r = encuesta._internos.interpretar('¿Qué comemos? | Pizza | Sushi | Pizza'.split(' '))
  assert.deepEqual([r.pregunta, r.opciones, r.selectableCount], ['¿Qué comemos?', ['Pizza', 'Sushi'], 1])
  const m = encuesta._internos.interpretar('-m Juegos | FF | Roblox | Minecraft'.split(' '))
  assert.equal(m.selectableCount, 3)
})

test('encuesta: valida cantidad y largo', () => {
  const { interpretar } = encuesta._internos
  assert.match(interpretar([]).error, /pregunta/)
  assert.match(interpretar(['P', '|', 'una']).error, /al menos 2/)
  assert.match(interpretar(['P|' + Array.from({ length: 13 }, (_, i) => 'o' + i).join('|')]).error, /Máximo 12/)
  assert.match(interpretar(['P|a|' + 'x'.repeat(101)]).error, /muy larga/)
})

test('.encuesta envía un poll válido', async () => {
  const sock = crearSock()
  await encuesta.execute(sock, MSG(), ['¿Hoy?', '|', 'Sí', '|', 'No'], { config })
  const poll = sock.enviados[0].contenido.poll
  assert.deepEqual([poll.name, poll.values, poll.selectableCount], ['¿Hoy?', ['Sí', 'No'], 1])
  await encuesta.execute(sock, MSG(), ['solo pregunta'], { config })
  assert.ok(sock.enviados[1].contenido.text.includes('Ejemplo'))
})

test('evento: fechas en hora de Perú (UTC-5)', () => {
  const { interpretarFecha } = evento._internos
  const ahora = new Date('2026-10-25T16:00:00Z') // 11:00 en Lima
  assert.equal(interpretarFecha('25/12 20:00', ahora).toISOString(), '2026-12-26T01:00:00.000Z')
  assert.equal(interpretarFecha('hoy 18:30', ahora).toISOString(), '2026-10-25T23:30:00.000Z')
  assert.equal(interpretarFecha('mañana 9:00', ahora).toISOString(), '2026-10-26T14:00:00.000Z')
  assert.equal(interpretarFecha('01/02/2027 08:15', ahora).toISOString(), '2027-02-01T13:15:00.000Z')
  assert.equal(interpretarFecha('31/02 10:00', ahora), null)
  assert.equal(interpretarFecha('25/12 25:00', ahora), null)
  assert.equal(interpretarFecha('algún día', ahora), null)
})

test('evento: una fecha del año que ya pasó se toma como el siguiente año', () => {
  const { interpretarFecha } = evento._internos
  const ahora = new Date('2026-10-25T16:00:00Z')
  assert.equal(interpretarFecha('01/03 10:00', ahora).getUTCFullYear(), 2027)
})

test('evento: "hoy" y "mañana" respetan el día de Perú aunque en UTC ya sea otro día', () => {
  const { interpretarFecha } = evento._internos
  const ahora = new Date('2026-10-26T02:00:00Z') // 21:00 del 25 en Lima
  assert.equal(interpretarFecha('hoy 23:00', ahora).toISOString(), '2026-10-26T04:00:00.000Z')
  assert.equal(interpretarFecha('mañana 08:00', ahora).toISOString(), '2026-10-26T13:00:00.000Z')
})

test('.evento valida y envía el evento', async () => {
  const { interpretar } = evento._internos
  const ahora = new Date('2026-10-25T16:00:00Z')
  assert.match(interpretar(['Fiesta'], ahora).error, /fecha/)
  assert.match(interpretar(['Fiesta', '|', '01/01/2020 10:00'], ahora).error, /ya pasó/)
  const ok = interpretar(['Fiesta', '|', 'mañana 20:00', '|', 'En casa'], ahora)
  assert.deepEqual([ok.nombre, ok.descripcion], ['Fiesta', 'En casa'])

  const sock = crearSock()
  await evento.execute(sock, MSG(), ['Fiesta', '|', 'mañana', '23:59'], { config })
  const e = sock.enviados[0].contenido.event
  assert.equal(e.name, 'Fiesta')
  assert.ok(e.startDate instanceof Date)
})

test('contacto: vCard con waid y por número, mención o respuesta', async () => {
  const { construirVCard, resolverObjetivo } = contacto._internos
  const v = construirVCard('51999888777', 'Juan; Pérez')
  assert.ok(v.includes('waid=51999888777:+51999888777') && v.includes('FN:Juan  Pérez'))

  assert.deepEqual(resolverObjetivo(MSG(), ['+51-999-888-777', 'Juan', 'Pérez']), { numero: '51999888777', nombre: 'Juan Pérez' })
  const mencion = MSG({ extendedTextMessage: { contextInfo: { mentionedJid: ['51222333444@s.whatsapp.net'] } } })
  assert.equal(resolverObjetivo(mencion, ['@51222333444']).numero, '51222333444')
  const respuesta = MSG({ extendedTextMessage: { contextInfo: { participant: '51555666777@s.whatsapp.net' } } })
  assert.equal(resolverObjetivo(respuesta, []).numero, '51555666777')
  assert.equal(resolverObjetivo(MSG(), ['hola']), null)
  assert.equal(resolverObjetivo(MSG(), ['123']), null)

  const sock = crearSock()
  await contacto.execute(sock, MSG(), ['51999888777', 'Juan'], { config })
  assert.equal(sock.enviados[0].contenido.contacts.contacts[0].displayName, 'Juan')
  await contacto.execute(sock, MSG(), [], { config })
  assert.ok(sock.enviados[1].contenido.text.includes('Indica un número'))
})

test('ubicacion: coordenadas sueltas o dentro de un enlace de Maps', async () => {
  const { extraerCoordenadas } = ubicacion._internos
  assert.deepEqual(extraerCoordenadas('-12.0464 -77.0428 Plaza Mayor'), { latitud: -12.0464, longitud: -77.0428, nombre: 'Plaza Mayor' })
  assert.deepEqual(extraerCoordenadas('-12.0464,-77.0428'), { latitud: -12.0464, longitud: -77.0428, nombre: '' })
  assert.deepEqual(extraerCoordenadas('https://www.google.com/maps/@-12.0464,-77.0428,15z'), { latitud: -12.0464, longitud: -77.0428, nombre: '' })
  assert.equal(extraerCoordenadas('91 10'), null)
  assert.equal(extraerCoordenadas('hola'), null)

  const sock = crearSock()
  await ubicacion.execute(sock, MSG(), ['-12.05', '-77.04', 'Lima'], { config })
  assert.deepEqual(sock.enviados[0].contenido.location, { degreesLatitude: -12.05, degreesLongitude: -77.04, name: 'Lima' })
})

test('enviarAlbum: crea el álbum padre y asocia cada foto', async () => {
  const sock = crearSock()
  await enviarAlbum(sock, 'c', [{ image: Buffer.from('1'), caption: 'a' }, { image: Buffer.from('2') }, { video: Buffer.from('3') }], { quoted: { id: 'q' } })
  const [padre, ...hijos] = sock.enviados
  assert.deepEqual(padre.contenido.album, { expectedImageCount: 2, expectedVideoCount: 1 })
  assert.equal(hijos.length, 3)
  assert.ok(hijos.every((h) => h.contenido.albumParentKey.id === 'K1'))
})

test('enviarAlbum: una sola imagen va suelta; si falla el álbum, van sueltas; sin medios lanza error', async () => {
  const uno = crearSock()
  await enviarAlbum(uno, 'c', [{ image: Buffer.from('1') }])
  assert.equal(uno.enviados.length, 1)
  assert.equal(uno.enviados[0].contenido.album, undefined)

  const roto = crearSock({ fallarAlbum: true })
  await enviarAlbum(roto, 'c', [{ image: Buffer.from('1') }, { image: Buffer.from('2') }])
  assert.equal(roto.enviados.length, 2)
  assert.ok(roto.enviados.every((e) => !e.contenido.albumParentKey))

  await assert.rejects(enviarAlbum(crearSock(), 'c', []), /no tiene fotos/)
})
