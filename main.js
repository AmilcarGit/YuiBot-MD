sock.ev.on('messages.upsert', async ({ messages, type }) => {
    if (type !== 'notify') return;

    const msg = messages[0];
    if (!msg.message) return;

    const jid = msg.key.remoteJid;
    const body = getMessageBody(msg);
    const esGrupo = jid.endsWith('@g.us');
    const nombre = msg.pushName || 'Desconocido';
    const remitente = msg.key.participantAlt || msg.key.participant || jid;
    const numeroRemitente = remitente.split('@')[0].split(':')[0];
    const hora = new Date().toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

    console.log(
      `[${hora}] ${esGrupo ? '👥' : '👤'} ${nombre} (${numeroRemitente})${esGrupo ? ` en grupo` : ''}: ${body || '[sin texto / multimedia]'}`
    );

    if (msg.key.fromMe) return;

    const parsed = parseCommand(body, config);
    if (!parsed) return;

    const command = commands.get(parsed.commandName);
    if (!command) return;

    if (command.ownerOnly) {
      const senderJid = msg.key.participantAlt || msg.key.participant || jid;

      if (!isOwner(senderJid, config)) {
        await sock.sendMessage(jid, { text: '⛔ Este comando es solo para el owner del bot.' });
        return;
      }
    }

    try {
      await command.execute(sock, msg, parsed.args, { commands, categories, config });
    } catch (err) {
      console.error(`Error ejecutando "${parsed.commandName}":`, err);
      await sock.sendMessage(jid, {
        text: '⚠️ Ocurrió un error ejecutando ese comando.',
      });
    }
  });