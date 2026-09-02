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
const { agregarXpConCooldown } = require('./lib/db');
const { contieneLink, detectarFlood, esAdminDeGrupo } = require('./lib/moderacion');

const statistics = require('./estadisticas');
const config = require('./defaults');

let metodoElegido = null;
let botIniciado = false;

function askQuestion(text) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

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

function conectarEstadisticasAlSocket(sock) {
  if (!sock || typeof sock.sendMessage !== 'function') {
    return;
  }

  const sendMessageOriginal = sock.sendMessage.bind(sock);

  sock.sendMessage = async (...args) => {
    try {
      const resultado = await sendMessageOriginal(...args);

      const jid = args[0] || null;

      statistics.messageSent({
        jid,
        type: 'message'
      });

      return resultado;
    } catch (error) {
      statistics.errorOccurred(error, {
        type: 'sendMessage'
      });

      throw error;
    }
  };
}

async function startBot() {
  try {
    const { state, saveCreds } = await useMultiFileAuthState(
      path.join(__dirname, 'session')
    );

    const { version } = await fetchLatestBaileysVersion();

    const yaVinculado = state.creds.registered;

    if (metodoElegido === null) {
      metodoElegido = yaVinculado
        ? false
        : await elegirMetodoDeVinculacion();
    }

    const usePairingCode =
      !yaVinculado && metodoElegido;

    const sock = makeWASocket({
      version,
      auth: state,
      logger: pino({
        level: 'silent'
      }),
      printQRInTerminal: false
    });

    conectarEstadisticasAlSocket(sock);

    const { commands, categories } = loadCommands();

    if (usePairingCode) {
      const phoneNumber =
        config.PHONE_NUMBER ||
        await askQuestion(
          '📞 Escribe tu número con código de país, sin "+" ni espacios (ej: 5218110000000): '
        );

      setTimeout(async () => {
        try {
          const code =
            await sock.requestPairingCode(
              phoneNumber.trim()
            );

          console.log(
            `🔑 Tu código de vinculación de ${config.BOT_NAME} es: ${code}`
          );

          console.log(
            '📱 Ve a WhatsApp > Dispositivos vinculados > Vincular con número de teléfono, e ingresa ese código.'
          );
        } catch (err) {
          statistics.errorOccurred(err, {
            type: 'pairing'
          });

          console.error(
            '❌ No se pudo generar el código de vinculación:',
            err
          );
        }
      }, 3000);
    }

    sock.ev.on(
      'connection.update',
      (update) => {
        const {
          connection,
          lastDisconnect,
          qr
        } = update;

        if (qr && !usePairingCode) {
          console.log(
            `📱 Escanea este QR con WhatsApp para vincular ${config.BOT_NAME}:`
          );

          qrcode.generate(qr, {
            small: true
          });
        }

        if (connection === 'close') {
          const statusCode =
            new Boom(lastDisconnect?.error)
              ?.output?.statusCode;

          const shouldReconnect =
            statusCode !== DisconnectReason.loggedOut;

          console.log(
            '❌ Conexión cerrada.',
            shouldReconnect
              ? 'Reconectando...'
              : 'Sesión cerrada, borra /session y vuelve a escanear.'
          );

          if (!shouldReconnect) {
            metodoElegido = null;

            statistics.registerConnection({
              status: 'logged_out'
            });

            return;
          }

          statistics.registerReconnect({
            statusCode
          });

          setTimeout(() => {
            startBot().catch((err) => {
              statistics.errorOccurred(err, {
                type: 'reconnect'
              });

              console.error(
                `❌ Error durante la reconexión de ${config.BOT_NAME}:`,
                err
              );
            });
          }, 2000);

        } else if (connection === 'open') {
          console.log(
            `✅ ${config.BOT_NAME} conectado a WhatsApp.`
          );

          if (!botIniciado) {
            botIniciado = true;

            statistics.registerConnection({
              status: 'open'
            });
          } else {
            statistics.registerConnection({
              status: 'reconnected'
            });
          }
        }
      }
    );

    sock.ev.on(
      'creds.update',
      saveCreds
    );

    sock.ev.on(
      'group-participants.update',
      async (update) => {
        console.log(
          '[WELCOME] Evento group-participants.update recibido:',
          JSON.stringify(update)
        );

        if (!config.WELCOME_ENABLED) {
          console.log(
            '[WELCOME] WELCOME_ENABLED está en false, se omite el envío.'
          );

          return;
        }

        if (update.action !== 'add') {
          console.log(
            `[WELCOME] Acción "${update.action}" ignorada (solo se procesa "add").`
          );

          return;
        }

        const jidGrupo = update.id;
        let metadata;

        try {
          metadata =
            await sock.groupMetadata(jidGrupo);
        } catch (error) {
          statistics.errorOccurred(error, {
            type: 'welcome_metadata'
          });

          console.error(
            '[WELCOME] No se pudo obtener la metadata del grupo, se aborta:',
            error
          );

          return;
        }

        for (const participante of update.participants) {
          try {
            const esObjeto =
              participante !== null &&
              typeof participante === 'object';

            const jidOriginal = esObjeto
              ? (
                  participante.id ||
                  participante.jid ||
                  participante.lid
                )
              : participante;

            if (!jidOriginal) {
              console.warn(
                '[WELCOME] Participante sin id/jid reconocible, se omite:',
                participante
              );

              continue;
            }

            const jidReal =
              (esObjeto &&
                participante.phoneNumber) ||
              jidOriginal;

            const numero =
              String(jidReal)
                .split('@')[0]
                .split(':')[0];

            let username = numero;

            try {
              const [info] =
                await sock.onWhatsApp(jidReal);

              if (info?.notify) {
                username = info.notify;
              }
            } catch (error) {
              console.warn(
                `[WELCOME] onWhatsApp() no disponible para ${jidReal}, se usa el número.`
              );
            }

            let avatar =
              'https://i.imgur.com/8Km9tLL.png';

            try {
              avatar =
                await sock.profilePictureUrl(
                  jidReal,
                  'image'
                );
            } catch (error) {
              console.warn(
                `[WELCOME] Sin foto de perfil pública para ${numero}, se usa la imagen de respaldo.`
              );
            }

            const imagen =
              await generarImagenBienvenida({
                username,
                guildName: metadata.subject,
                memberCount:
                  metadata.participants.length,
                avatar,
                background:
                  config.WELCOME_BACKGROUND,
                botName: config.BOT_NAME
              });

            await sock.sendMessage(
              jidGrupo,
              {
                image: imagen,
                caption:
                  `🥀 ¡Bienvenido/a @${numero} a *${metadata.subject}*!`,
                mentions: [jidReal]
              }
            );

            console.log(
              `[WELCOME] Bienvenida enviada a ${numero} en "${metadata.subject}".`
            );

          } catch (error) {
            statistics.errorOccurred(error, {
              type: 'welcome'
            });

            console.error(
              '[WELCOME] Error procesando a un participante, se continúa con los demás:',
              error
            );
          }
        }
      }
    );

    sock.ev.on(
      'messages.upsert',
      async ({ messages, type }) => {
        if (type !== 'notify') {
          return;
        }

        for (const msg of messages) {
          try {
            if (!msg?.message) {
              continue;
            }

            const jid =
              msg.key?.remoteJid;

            if (!jid) {
              continue;
            }

            if (msg.key?.fromMe) {
              continue;
            }

            const body =
              getMessageBody(msg);

            const esGrupo =
              jid.endsWith('@g.us');

            const nombre =
              msg.pushName ||
              'Desconocido';

            const remitente =
              msg.key.participantAlt ||
              msg.key.participant ||
              jid;

            const numeroRemitente =
              String(remitente)
                .split('@')[0]
                .split(':')[0];

            const hora =
              new Date().toLocaleTimeString(
                'es-PE',
                {
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit'
                }
              );

            statistics.messageReceived({
              jid,
              sender: remitente,
              group: esGrupo,
              body: body || ''
            });

            console.log(
              `[${hora}] ${esGrupo ? '👥' : '👤'} ${nombre} (${numeroRemitente})${esGrupo ? ' en grupo' : ''}: ${body || '[sin texto / multimedia]'}`
            );

            if (esGrupo) {
              try {
                const resultadoXp =
                  agregarXpConCooldown(
                    numeroRemitente,
                    config.XP
                  );

                if (resultadoXp?.subioDeNivel) {
                  console.log(
                    `[XP] ${numeroRemitente} subió a nivel ${resultadoXp.nivel}.`
                  );

                  await sock.sendMessage(
                    jid,
                    {
                      text:
                        `🎉 @${numeroRemitente} subió al *nivel ${resultadoXp.nivel}*! (${resultadoXp.xp} XP total)`,
                      mentions: [remitente]
                    }
                  );
                }

              } catch (error) {
                statistics.errorOccurred(error, {
                  type: 'xp'
                });

                console.error(
                  '[XP] Error actualizando experiencia:',
                  error
                );
              }

              const antilinkActivo =
                config.MODERACION?.ANTILINK;

              const antifloodActivo =
                config.MODERACION?.ANTIFLOOD?.ENABLED;

              if (
                antilinkActivo ||
                antifloodActivo
              ) {
                try {
                  const esOwnerBot =
                    isOwner(
                      remitente,
                      config
                    );

                  if (!esOwnerBot) {
                    let metadata = null;

                    if (
                      antilinkActivo &&
                      contieneLink(body)
                    ) {
                      metadata =
                        metadata ||
                        await sock.groupMetadata(jid);

                      if (
                        !esAdminDeGrupo(
                          metadata,
                          numeroRemitente
                        )
                      ) {
                        console.log(
                          `[MODERACION] Link detectado de ${numeroRemitente}, se elimina el mensaje.`
                        );

                        await sock.sendMessage(
                          jid,
                          {
                            delete: msg.key
                          }
                        );

                        await sock.sendMessage(
                          jid,
                          {
                            text:
                              `🚫 @${numeroRemitente}, no se permiten enlaces en este grupo.`,
                            mentions: [
                              remitente
                            ]
                          }
                        );

                        continue;
                      }
                    }

                    if (antifloodActivo) {
                      metadata =
                        metadata ||
                        await sock.groupMetadata(jid);

                      if (
                        !esAdminDeGrupo(
                          metadata,
                          numeroRemitente
                        ) &&
                        detectarFlood(
                          numeroRemitente,
                          config.MODERACION.ANTIFLOOD
                        )
                      ) {
                        console.log(
                          `[MODERACION] Flood detectado de ${numeroRemitente}.`
                        );

                        await sock.sendMessage(
                          jid,
                          {
                            text:
                              `⚠️ @${numeroRemitente}, estás enviando mensajes muy rápido. Tranquilo un momento.`,
                            mentions: [
                              remitente
                            ]
                          }
                        );
                      }
                    }
                  }

                } catch (error) {
                  statistics.errorOccurred(error, {
                    type: 'moderation'
                  });

                  console.error(
                    '[MODERACION] Error al procesar antilink/antiflood:',
                    error
                  );
                }
              }
            }

            const parsed =
              parseCommand(
                body,
                config
              );

            if (!parsed) {
              continue;
            }

            const command =
              commands.get(
                parsed.commandName
              );

            if (!command) {
              continue;
            }

            if (command.ownerOnly) {
              const senderJid =
                msg.key.participantAlt ||
                msg.key.participant ||
                jid;

              if (
                !isOwner(
                  senderJid,
                  config
                )
              ) {
                await sock.sendMessage(
                  jid,
                  {
                    text:
                      '⛔ Este comando es solo para el owner del bot.'
                  }
                );

                continue;
              }
            }

            statistics.commandExecuted(
              parsed.commandName,
              {
                jid,
                sender: remitente,
                group: esGrupo
              }
            );

            try {
              await command.execute(
                sock,
                msg,
                parsed.args,
                {
                  commands,
                  categories,
                  config
                }
              );

            } catch (err) {
              statistics.errorOccurred(
                err,
                {
                  type: 'command',
                  command:
                    parsed.commandName,
                  jid,
                  sender: remitente
                }
              );

              console.error(
                `Error ejecutando "${parsed.commandName}":`,
                err
              );

              try {
                await sock.sendMessage(
                  jid,
                  {
                    text:
                      '⚠️ Ocurrió un error ejecutando ese comando.'
                  }
                );
              } catch (sendError) {
                statistics.errorOccurred(
                  sendError,
                  {
                    type:
                      'command_error_response'
                  }
                );
              }
            }

          } catch (error) {
            statistics.errorOccurred(
              error,
              {
                type:
                  'messages_upsert'
              }
            );

            console.error(
              '❌ Error procesando mensaje:',
              error
            );
          }
        }
      }
    );

  } catch (error) {
    statistics.errorOccurred(
      error,
      {
        type: 'startBot'
      }
    );

    console.error(
      `❌ Error al iniciar ${config.BOT_NAME}:`,
      error
    );

    setTimeout(() => {
      startBot().catch((err) => {
        statistics.errorOccurred(
          err,
          {
            type: 'startBot_retry'
          }
        );

        console.error(
          `❌ Error reintentando iniciar ${config.BOT_NAME}:`,
          err
        );
      });
    }, 5000);
  }
}

startBot().catch((err) => {
  statistics.errorOccurred(
    err,
    {
      type: 'main'
    }
  );

  console.error(
    `Error al iniciar ${config.BOT_NAME}:`,
    err
  );
});