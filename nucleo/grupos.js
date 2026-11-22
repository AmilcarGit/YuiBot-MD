// Código Oficial de YuiBot-MD.by AmilcarGit
import ajustes from '../ajustes.js'
import { chat } from './memoria.js'
import { encolar } from './cola.js'
import { soloNumero } from './utiles.js'

export async function eventosGrupo(sock, { id, participants, action }) {
  if (action !== 'add') return
  const config = chat(id)

  for (const participante of participants) {
    const texto = typeof participante === 'string'
    const jid = texto ? participante : participante.id
    const numero = soloNumero(texto ? participante : participante.phoneNumber || participante.id)

    if (config.antifalsos && ajustes.falsos.some(prefijo => numero.startsWith(prefijo))) {
      await sock.groupParticipantsUpdate(id, [jid], 'remove').catch(() => {})
      continue
    }

    if (config.bienvenida) {
      await encolar(id, () => sock.sendMessage(id, {
        text: `Bienvenido @${soloNumero(jid)} a este grupo.`,
        mentions: [jid]
      }))
    }
  }
}
