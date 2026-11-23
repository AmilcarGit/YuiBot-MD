import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'fs'
import os from 'os'
import path from 'path'

// memoria.js resuelve `data/` respecto al directorio actual al importarse.
const raiz = fs.mkdtempSync(path.join(os.tmpdir(), 'yui-memoria-'))
process.chdir(raiz)
fs.mkdirSync('data')

const bueno = { 51900000001: { nombre: 'Ana', xp: 40, monedas: 123 } }
fs.writeFileSync('data/usuarios.json', '{"51900000001":{"nombre":"Ana","xp":4')
fs.writeFileSync('data/usuarios.json.bak', JSON.stringify(bueno))
fs.writeFileSync('data/chats.json', '{roto')

const { iniciarMemoria, guardar, usuario, todosUsuarios } = await import('../nucleo/memoria.js')
await iniciarMemoria()

test('un archivo dañado se recupera del respaldo y se conserva aparte', () => {
  assert.equal(todosUsuarios()['51900000001'].monedas, 123)
  const aparte = fs.readdirSync('data').filter(f => f.startsWith('usuarios.corrupto-'))
  assert.equal(aparte.length, 1)
})

test('sin respaldo válido arranca vacío pero no destruye el archivo roto', () => {
  const aparte = fs.readdirSync('data').filter(f => f.startsWith('chats.corrupto-'))
  assert.equal(aparte.length, 1)
  assert.equal(fs.readFileSync(path.join('data', aparte[0]), 'utf8'), '{roto')
})

test('guardar persiste los cambios y es idempotente', () => {
  usuario('51900000002').monedas = 7
  guardar()
  const primera = fs.readFileSync('data/usuarios.json', 'utf8')
  guardar()
  assert.equal(fs.readFileSync('data/usuarios.json', 'utf8'), primera)
  assert.equal(JSON.parse(primera)['51900000002'].monedas, 7)
})

test('los usuarios nuevos traen los campos de cooldown', () => {
  const u = usuario('51900000003')
  assert.equal(u.esperaTrabajo, 0)
  assert.equal(u.ultimoAdivina, 0)
})

test('moverUsuario pasa el perfil del id oculto al teléfono sin pisar uno existente', async () => {
  const { moverUsuario, usuario } = await import('../nucleo/memoria.js')
  usuario('111111111111111').monedas = 77
  assert.equal(moverUsuario('111111111111111', '51900000009'), true)
  assert.equal(usuario('51900000009').monedas, 77)
  usuario('222222222222222').monedas = 1
  assert.equal(moverUsuario('222222222222222', '51900000009'), false)
  assert.equal(usuario('51900000009').monedas, 77)
})
