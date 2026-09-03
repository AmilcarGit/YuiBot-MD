//CÓDIGO ORIGINAL DE YUIBOT-MD
const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
} = require('@whiskeysockets/baileys');
const { Boom } = require('@hapi/boom');
const qrcode = require('qrcode-terminal');
const pino = require('pino');
const path = require('path');
const readline = require('readline');

const { loadCommands } = require('./lib/cargador');
const { getMessageBody, parseCommand, isOwner } = require('./lib/handler');
const { generarImagenBienvenida } = require('./lib/welcome');
const { agregarXpConCooldown, obtenerGrupo, registrarAvisoAntilink, reiniciarAvisosAntilink } = require('./lib/db');
const { contieneLink, detectarFlood, esAdminDeGrupo } = require('./lib/moderacion');
const { obtenerRangoExacto } = require('./lib/roles');
const { limpiarPreKeysAntiguas, respaldarSesion } = require('./lib/mantenimiento');
const config = require('./defaults');

const col = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  rosa: '\x1b[95m',
  morado: '\x1b[35m',
  verde: '\x1b[92m',
  amarillo: '\x1b[93m',
  cian: '\x1b[96m',
  gris: '\x1b[90m',
};

function printBanner({ totalComandos }) {
  const linea = '─'.repeat(42);
  console.log(`\n${col.morado}┌${linea}┐${col.reset}`);
  console.log(`${col.morado}│${col.reset}  ${col.bold}${col.rosa}🌸 ${config.BOT_NAME}${col.reset}  ${col.gris}v${config.BOT_VERSION}${col.reset}`);
  console.log(`${col.morado}│${col.reset}  ${col.cian}Prefijos:${col.reset} ${config.PREFIXES.join(' ')} ${config.ALLOW_NO_PREFIX ? '(o sin prefijo)' : ''}`);
  console.log(`${col.morado}│${col.reset}  ${col.cian}Comandos:${col.reset} ${totalComandos}`);
  console.log(`${col.morado}│${col.reset}  ${col.cian}Node:${col.reset} ${process.version}`);
  console.log(`${col.morado}└${linea}┘${col.reset}\n`);
}

let metodoElegido = null;
let mantenimientoIniciado = false;

function iniciarMantenimiento() {
  if (mantenimientoIniciado) return;
  mantenimientoIniciado = true;

  const rutaSession = path.join(__dirname, 'session');
  const rutaBackups = path.join(__dirname, 'backups');
  const cfg = config.MANTENIMIENTO || {};

  const ejecutarLimpieza = () => {
    try {
      const { eliminados } = limpiarPreKeysAntiguas(rutaSession, cfg.PREKEYS_DIAS_ANTIGUEDAD ?? 3);
      if (eliminados > 0) {
        console.log(`${col.cian}🧹 Limpieza de sesión: ${eliminados} pre-key(s) antigua(s) eliminada(s).${col.reset}`);
      }
    } catch (error) {
      console.error('[MANTENIMIENTO] Error limpiando pre-keys:', error);
    }
  };

  const ejecutarBackup = () => {
    try {
      const destino = respaldarSesion(rutaSession, rutaBackups, cfg.BACKUP_MAX ?? 5);
      if (destino) {
        console.log(`${col.cian}💾 Backup de sesión creado: ${destino}${col.reset}`);
      }
    } catch (error) {
      console.error('[MANTENIMIENTO] Error respaldando sesión:', error);
    }
  };

  ejecutarLimpieza();
  ejecutarBackup();

  setInterval(ejecutarLimpieza, (cfg.LIMPIEZA_PREKEYS_HORAS ?? 6) * 60 * 60 * 1000);
  setInterval(ejecutarBackup, (cfg.BACKUP_HORAS ?? 12) * 60 * 60 * 1000);
}

function askQuestion(text) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(text, (answer) => {
      rl.close();
      resolve(answer);
    });
  });
}

async function elegirMetodoDeVinculacion() {
  console.log(`\n⛧───「 ${config.BOT_NAME} 」───⛧`);
  console.log('¿Cómo quieres vincular el bot?\n');
  console.log('  [Enter]  → Vincular con código QR');
  console.log('  [1]      → Vincular con código de emparejamiento (número de teléfono)\n');

  const respuesta = await askQuestion('Elige una opción: ');
  return respuesta.trim() === '1';
}

async function startBot() {
  const { state, saveCreds } = await useMultiFileAuthState(
    path.join(__dirname, 'session')
  );
  const { version } = await fetchLatestBaileysVersion();

  const yaVinculado = state.creds.registered;

  if (metodoElegido === null) {
    metodoElegido = yaVinculado ? false : await elegirMetodoDeVinculacion();
  }

  const usePairingCode = !yaVinculado && metodoElegido;

  const sock = makeWASocket({
    version,
    auth: state,
    logger: pino({ level: 'silent' }),
    printQRInTerminal: false,
  });

  const { commands, categories } = loadCommands();
  printBanner({ totalComandos: [...new Set(commands.values())].length });
  iniciarMantenimiento();

  if (usePairingCode) {
    const phoneNumber = config.PHONE_NUMBER || (await askQuestion('📞 Escribe tu número con código de país, sin "+" ni espacios (ej: 5218110000000): '));

    setTimeout(async () => {
      try {
        const code = await sock.requestPairingCode(phoneNumber.trim());
        console.log(`🔑 Tu código de vinculación de ${config.BOT_NAME} es: ${code}`);
        console.log('📱 Ve a WhatsApp > Dispositivos vinculados > Vincular con número de teléfono, e ingresa ese código.');
      } catch (err) {
        console.error('❌ No se pudo generar el código de vinculación:', err);
      }
    }, 3000);
  }

  sock.ev.on('connection.update', (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr && !usePairingCode) {
      console.log(`📱 Escanea este QR con WhatsApp para vincular ${config.BOT_NAME}:`);
      qrcode.generate(qr, { small: true });
    }

    if (connection === 'close') {
      const statusCode = new Boom(lastDisconnect?.error)?.output?.statusCode;
      const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
      console.log(`${col.rosa}❌ Conexión cerrada.${col.reset}`, shouldReconnect ? `${col.amarillo}Reconectando...${col.reset}` : `${col.rosa}Sesión cerrada, borra /session y vuelve a escanear.${col.reset}`);
      if (!shouldReconnect) metodoElegido = null;
      if (shouldReconnect) startBot();
    } else if (connection === 'open') {
      console.log(`${col.verde}${col.bold}✅ ${config.BOT_NAME} conectado a WhatsApp.${col.reset}`);
    }
  });

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('group-participants.update', async (update) => {
    console.log('[WELCOME] Evento group-participants.update recibido:', JSON.stringify(update));

    const esAlta = update.action === 'add';
    const esBaja = update.action === 'remove';

    if (!esAlta && !esBaja) {
      console.log(`[WELCOME] Acción "${update.action}" ignorada (solo se procesan "add" y "remove").`);
      return;
    }

    if (esAlta && !config.WELCOME_ENABLED) {
      console.log('[WELCOME] WELCOME_ENABLED está en false, se omite el envío.');
      return;
    }

    if (esBaja && !config.BYE_ENABLED) {
      console.log('[WELCOME] BYE_ENABLED está en false, se omite el envío.');
      return;
    }

    const jidGrupo = update.id;
    let metadata;

    try {
      metadata = await sock.groupMetadata(jidGrupo);
    } catch (error) {
      console.error('[WELCOME] No se pudo obtener la metadata del grupo, se aborta:', error);
      return;
    }

    const datosGrupo = obtenerGrupo(jidGrupo);

    for (const participante of update.participants) {
      try {
        const esObjeto = participante !== null && typeof participante === 'object';
        const jidOriginal = esObjeto
          ? (participante.id || participante.jid || participante.lid)
          : participante;

        if (!jidOriginal) {
          console.warn('[WELCOME] Participante sin id/jid reconocible, se omite:', participante);
          continue;
        }

        const jidReal = (esObjeto && participante.phoneNumber) || jidOriginal;
        const numero = String(jidReal).split('@')[0].split(':')[0];

        let username = numero;
        try {
          const [info] = await sock.onWhatsApp(jidReal);
          if (info?.notify) username = info.notify;
        } catch (error) {
          console.warn(`[WELCOME] onWhatsApp() no disponible para ${jidReal}, se usa el número.`);
        }

        let avatar = 'https://i.imgur.com/8Km9tLL.png';
        try {
          avatar = await sock.profilePictureUrl(jidReal, 'image');
        } catch (error) {
          console.warn(`[WELCOME] Sin foto de perfil pública para ${numero}, se usa la imagen de respaldo.`);
        }

        const plantillaDefecto = esBaja
          ? '👋 @user salió de *@grupo*. ¡Hasta pronto!'
          : '🥀 ¡Bienvenido/a @user a *@grupo*!';
        const plantilla = (esBaja ? datosGrupo?.textoDespedida : datosGrupo?.textoBienvenida) || plantillaDefecto;
        const caption = plantilla.replace(/@user/gi, `@${numero}`).replace(/@grupo/gi, metadata.subject);

        const imagen = await generarImagenBienvenida({
          username,
          guildName: metadata.subject,
          memberCount: metadata.participants.length,
          avatar,
          background: config.WELCOME_BACKGROUND,
          botName: config.BOT_NAME,
          etiqueta: esBaja ? '⛧ SE FUE DE ⛧' : '⛧ BIENVENIDO A ⛧',
        });

        await sock.sendMessage(jidGrupo, {
          image: imagen,
          caption,
          mentions: [jidReal],
        });

        console.log(`[WELCOME] ${esBaja ? 'Despedida' : 'Bienvenida'} enviada a ${numero} en "${metadata.subject}".`);
      } catch (error) {
        console.error('[WELCOME] Error procesando a un participante, se continúa con los demás:', error);
      }
    }
  });

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

    if (esGrupo) {
      try {
        const resultadoXp = agregarXpConCooldown(numeroRemitente, config.XP);
        if (resultadoXp?.subioDeNivel) {
          console.log(`[XP] ${numeroRemitente} subió a nivel ${resultadoXp.nivel}.`);
          await sock.sendMessage(jid, {
            text: `🎉 @${numeroRemitente} subió al *nivel ${resultadoXp.nivel}*! (${resultadoXp.xp} XP total)`,
            mentions: [remitente],
          });

          const rangoNuevo = obtenerRangoExacto(resultadoXp.nivel);
          if (rangoNuevo) {
            await sock.sendMessage(jid, {
              text: `🏅 @${numeroRemitente} desbloqueó el rango *"${rangoNuevo.nombre}"* al llegar a nivel ${rangoNuevo.nivel}.`,
              mentions: [remitente],
            });
          }
        }
      } catch (error) {
        console.error('[XP] Error actualizando experiencia:', error);
      }

      const antilinkActivo = config.MODERACION?.ANTILINK?.ENABLED;
      const antifloodActivo = config.MODERACION?.ANTIFLOOD?.ENABLED;

      if (antilinkActivo || antifloodActivo) {
        try {
          const esOwnerBot = isOwner(remitente, config);

          if (!esOwnerBot) {
            let metadata = null;

            if (antilinkActivo && contieneLink(body)) {
              metadata = metadata || await sock.groupMetadata(jid);
              if (!esAdminDeGrupo(metadata, numeroRemitente)) {
                console.log(`[MODERACION] Link detectado de ${numeroRemitente}, se elimina el mensaje.`);
                await sock.sendMessage(jid, { delete: msg.key });

                const autoKick = config.MODERACION.ANTILINK.AUTO_KICK;
                const maxAvisos = config.MODERACION.ANTILINK.MAX_AVISOS || 3;

                if (autoKick) {
                  const avisos = registrarAvisoAntilink(numeroRemitente);

                  if (avisos >= maxAvisos) {
                    reiniciarAvisosAntilink(numeroRemitente);
                    try {
                      await sock.groupParticipantsUpdate(jid, [remitente], 'remove');
                      await sock.sendMessage(jid, {
                        text: `🚫 @${numeroRemitente} fue expulsado por enviar enlaces prohibidos ${maxAvisos} veces.`,
                        mentions: [remitente],
                      });
                    } catch (error) {
                      console.error('[MODERACION] No se pudo expulsar (¿el bot es admin?):', error);
                      await sock.sendMessage(jid, {
                        text: `🚫 @${numeroRemitente} superó el límite de avisos, pero no pude expulsarlo. ¿Soy administrador del grupo?`,
                        mentions: [remitente],
                      });
                    }
                    return;
                  }

                  await sock.sendMessage(jid, {
                    text: `🚫 @${numeroRemitente}, no se permiten enlaces en este grupo. Aviso ${avisos}/${maxAvisos}.`,
                    mentions: [remitente],
                  });
                  return;
                }

                await sock.sendMessage(jid, {
                  text: `🚫 @${numeroRemitente}, no se permiten enlaces en este grupo.`,
                  mentions: [remitente],
                });
                return;
              }
            }

            if (antifloodActivo) {
              metadata = metadata || await sock.groupMetadata(jid);
              if (!esAdminDeGrupo(metadata, numeroRemitente) && detectarFlood(numeroRemitente, config.MODERACION.ANTIFLOOD)) {
                console.log(`[MODERACION] Flood detectado de ${numeroRemitente}.`);
                await sock.sendMessage(jid, {
                  text: `⚠️ @${numeroRemitente}, estás enviando mensajes muy rápido. Tranquilo un momento.`,
                  mentions: [remitente],
                });
              }
            }
          }
        } catch (error) {
          console.error('[MODERACION] Error al procesar antilink/antiflood:', error);
        }
      }
    }

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

  process.once('SIGINT', () => {
    console.log(`\n${col.amarillo}👋 Cerrando ${config.BOT_NAME}...${col.reset}`);
    sock.end(undefined);
    process.exit(0);
  });
}

process.on('unhandledRejection', (reason) => {
  console.error(`${col.rosa}⚠️ Promesa no manejada:${col.reset}`, reason);
});

process.on('uncaughtException', (err) => {
  console.error(`${col.rosa}⚠️ Excepción no capturada:${col.reset}`, err);
});

startBot().catch((err) => console.error(`Error al iniciar ${config.BOT_NAME}:`, err));