const fs = require('fs');
const path = require('path');
const os = require('os');

const statistics = require('./estadisticas');

function formatBytes(bytes) {
  if (!Number.isFinite(bytes)) {
    return '0 B';
  }

  const units = ['B', 'KB', 'MB', 'GB', 'TB'];

  let value = bytes;
  let index = 0;

  while (
    value >= 1024 &&
    index < units.length - 1
  ) {
    value /= 1024;
    index++;
  }

  return `${value.toFixed(index === 0 ? 0 : 2)} ${units[index]}`;
}

function formatUptime(seconds) {
  seconds = Math.floor(
    Number(seconds) || 0
  );

  const days =
    Math.floor(seconds / 86400);

  seconds %= 86400;

  const hours =
    Math.floor(seconds / 3600);

  seconds %= 3600;

  const minutes =
    Math.floor(seconds / 60);

  seconds %= 60;

  const parts = [];

  if (days) {
    parts.push(`${days}d`);
  }

  if (hours) {
    parts.push(`${hours}h`);
  }

  if (minutes) {
    parts.push(`${minutes}m`);
  }

  if (seconds || !parts.length) {
    parts.push(`${seconds}s`);
  }

  return parts.join(' ');
}

function getCommandDirectories() {
  return [
    path.join(process.cwd(), 'comandos'),
    path.join(process.cwd(), 'commands'),
    path.join(process.cwd(), 'plugins'),
    path.join(process.cwd(), 'plugins', 'commands'),
    path.join(process.cwd(), 'src', 'commands'),
    path.join(process.cwd(), 'src', 'comandos')
  ];
}

function countCommands() {
  const visited = new Set();
  let total = 0;

  function scan(directory) {
    if (!fs.existsSync(directory)) {
      return;
    }

    let realPath;

    try {
      realPath =
        fs.realpathSync(directory);
    } catch {
      return;
    }

    if (visited.has(realPath)) {
      return;
    }

    visited.add(realPath);

    let entries;

    try {
      entries =
        fs.readdirSync(
          directory,
          {
            withFileTypes: true
          }
        );
    } catch {
      return;
    }

    for (const entry of entries) {
      const fullPath =
        path.join(
          directory,
          entry.name
        );

      if (entry.isDirectory()) {
        scan(fullPath);
        continue;
      }

      if (
        entry.isFile() &&
        entry.name.endsWith('.js')
      ) {
        if (
          entry.name !== 'main.js' &&
          entry.name !== 'estadisticas.js'
        ) {
          total++;
        }
      }
    }
  }

  for (
    const directory of getCommandDirectories()
  ) {
    scan(directory);
  }

  return total;
}

function getBotName(sock) {
  try {
    if (sock?.user?.name) {
      return sock.user.name;
    }

    if (sock?.user?.verifiedName) {
      return sock.user.verifiedName;
    }

    if (sock?.user?.id) {
      return sock.user.id
        .split(':')[0]
        .split('@')[0];
    }
  } catch {}

  return 'YuiBot-MD';
}

function getConnectionStatus(sock) {
  try {
    if (!sock) {
      return '🔴 Desconectado';
    }

    if (sock.ws?.isOpen) {
      return '🟢 Conectado';
    }

    if (sock.user) {
      return '🟡 Sesión activa';
    }

    return '🔴 Desconectado';
  } catch {
    return '⚪ Desconocido';
  }
}

async function getGroups(sock) {
  try {
    if (
      !sock ||
      typeof sock.groupFetchAllParticipating !==
        'function'
    ) {
      return {
        groups: 0,
        participants: 0
      };
    }

    const groups =
      await sock.groupFetchAllParticipating();

    const list =
      Object.values(groups || {});

    let participants = 0;

    for (const group of list) {
      if (
        Array.isArray(
          group.participants
        )
      ) {
        participants +=
          group.participants.length;
      }
    }

    return {
      groups: list.length,
      participants
    };

  } catch {
    return {
      groups: 0,
      participants: 0
    };
  }
}

function buildHeader() {
  return [
    '╭━━━〔 🤖 YUIBOT-MD 〕━━━╮',
    '┃ 📊 INFORMACIÓN EN TIEMPO REAL',
    '╰━━━━━━━━━━━━━━━━━━━━━━╯'
  ].join('\n');
}

function buildGeneral(sock, groups) {
  const stats =
    statistics.getFormattedSnapshot();

  const memory =
    stats.memoryFormatted;

  const now =
    new Date().toLocaleString(
      'es-PE',
      {
        timeZone:
          'America/Lima'
      }
    );

  return [
    buildHeader(),
    '',
    `🤖 Bot: ${getBotName(sock)}`,
    `📡 Estado: ${getConnectionStatus(sock)}`,
    `⏱️ Uptime: ${formatUptime(stats.uptime)}`,
    `📅 Hora: ${now}`,
    '',
    '╭─〔 📊 ESTADÍSTICAS 〕',
    `│ 📨 Recibidos: ${stats.messagesReceived}`,
    `│ 📤 Enviados: ${stats.messagesSent}`,
    `│ ⚡ Comandos: ${stats.commandsExecuted}`,
    `│ ❌ Errores: ${stats.errors}`,
    `│ 🔄 Reinicios: ${stats.restarts}`,
    `│ 🔌 Reconexiones: ${stats.reconnections}`,
    '╰────────────────────',
    '',
    '╭─〔 👥 WHATSAPP 〕',
    `│ 👥 Grupos: ${groups.groups}`,
    `│ 🧑‍🤝‍🧑 Participantes: ${groups.participants}`,
    '╰────────────────────',
    '',
    '╭─〔 💻 SERVIDOR 〕',
    `│ 🟢 Node: ${stats.node.version}`,
    `│ 🖥️ OS: ${stats.node.platform}`,
    `│ 🧩 Arch: ${stats.node.arch}`,
    `│ ⚙️ CPU: ${stats.cpu.cores} núcleos`,
    `│ 🧠 RAM proceso: ${memory.rss}`,
    `│ 💾 RAM total: ${memory.systemTotal}`,
    `│ 📦 RAM libre: ${memory.systemFree}`,
    `│ 🆔 PID: ${stats.node.pid}`,
    '╰────────────────────'
  ].join('\n');
}

function buildCommands() {
  const stats =
    statistics.getFormattedSnapshot();

  const total =
    countCommands();

  const lines = [
    buildHeader(),
    '',
    '╭─〔 🧩 COMANDOS 〕',
    `│ 📁 Detectados: ${total}`,
    `│ ⚡ Ejecutados: ${stats.commandsExecuted}`,
    '╰────────────────────',
    ''
  ];

  if (stats.topCommands.length) {
    lines.push(
      '╭─〔 🔥 MÁS USADOS 〕'
    );

    stats.topCommands.forEach(
      (item, index) => {
        lines.push(
          `│ ${index + 1}. .${item.command} — ${item.count}`
        );
      }
    );

    lines.push(
      '╰────────────────────'
    );
  } else {
    lines.push(
      '📭 Todavía no se ha ejecutado ningún comando.'
    );
  }

  return lines.join('\n');
}

function buildActivity() {
  const stats =
    statistics.getFormattedSnapshot();

  const lines = [
    buildHeader(),
    '',
    '╭─〔 ⚡ ACTIVIDAD RECIENTE 〕'
  ];

  if (!stats.activity.length) {
    lines.push(
      '│ 📭 Sin actividad registrada.'
    );
  } else {
    stats.activity
      .slice(0, 15)
      .forEach((item) => {
        const time =
          new Date(
            item.time
          ).toLocaleTimeString(
            'es-PE',
            {
              timeZone:
                'America/Lima',
              hour:
                '2-digit',
              minute:
                '2-digit',
              second:
                '2-digit'
            }
          );

        let description =
          item.type;

        if (
          item.type ===
          'message_received'
        ) {
          description =
            '📨 Mensaje recibido';
        }

        if (
          item.type ===
          'message_sent'
        ) {
          description =
            '📤 Mensaje enviado';
        }

        if (
          item.type ===
          'command'
        ) {
          description =
            `⚡ .${item.command}`;
        }

        if (
          item.type ===
          'error'
        ) {
          description =
            '❌ Error';
        }

        if (
          item.type ===
          'reconnect'
        ) {
          description =
            '🔌 Reconexión';
        }

        if (
          item.type ===
          'connected'
        ) {
          description =
            '🟢 Conectado';
        }

        lines.push(
          `│ ${time} • ${description}`
        );
      });
  }

  lines.push(
    '╰────────────────────'
  );

  return lines.join('\n');
}

function buildSystem() {
  const stats =
    statistics.getFormattedSnapshot();

  return [
    buildHeader(),
    '',
    '╭─〔 💻 SISTEMA 〕',
    `│ 🟢 Node.js: ${stats.node.version}`,
    `│ 🖥️ Plataforma: ${stats.node.platform}`,
    `│ 🧩 Arquitectura: ${stats.node.arch}`,
    `│ ⚙️ CPU: ${stats.cpu.cores} núcleos`,
    `│ 🔧 Modelo: ${stats.cpu.model}`,
    `│ 🧠 RAM proceso: ${stats.memoryFormatted.rss}`,
    `│ 📊 Heap usado: ${stats.memoryFormatted.heapUsed}`,
    `│ 📦 Heap total: ${stats.memoryFormatted.heapTotal}`,
    `│ 💾 RAM total: ${stats.memoryFormatted.systemTotal}`,
    `│ 🟢 RAM libre: ${stats.memoryFormatted.systemFree}`,
    `│ 🆔 PID: ${stats.node.pid}`,
    '╰────────────────────'
  ].join('\n');
}

function buildHelp() {
  return [
    buildHeader(),
    '',
    '╭─〔 📖 COMANDOS 〕',
    '│ .infobot',
    '│ .infobot general',
    '│ .infobot comandos',
    '│ .infobot actividad',
    '│ .infobot sistema',
    '│ .infobot todo',
    '╰────────────────────'
  ].join('\n');
}

module.exports = {
  name: 'infobot',

  aliases: [
    'botinfo',
    'info',
    'estado',
    'status'
  ],

  description:
    'Información y estadísticas del bot en tiempo real.',

  category: 'informacion',

  async execute(
    sock,
    msg,
    args
  ) {
    const jid =
      msg?.key?.remoteJid;

    if (!jid) {
      return;
    }

    try {
      await sock.sendMessage(
        jid,
        {
          text:
            '⏳ Consultando información en tiempo real...'
        }
      );

      const option =
        args
          .join(' ')
          .trim()
          .toLowerCase();

      let response;

      if (
        !option ||
        [
          'general',
          'estado',
          'status'
        ].includes(option)
      ) {
        const groups =
          await getGroups(sock);

        response =
          buildGeneral(
            sock,
            groups
          );

      } else if (
        [
          'comandos',
          'commands',
          'cmds'
        ].includes(option)
      ) {
        response =
          buildCommands();

      } else if (
        [
          'actividad',
          'activity',
          'logs'
        ].includes(option)
      ) {
        response =
          buildActivity();

      } else if (
        [
          'sistema',
          'system',
          'server'
        ].includes(option)
      ) {
        response =
          buildSystem();

      } else if (
        [
          'todo',
          'all',
          'completo',
          'full'
        ].includes(option)
      ) {
        const groups =
          await getGroups(sock);

        response = [
          buildGeneral(
            sock,
            groups
          ),
          '',
          buildCommands(),
          '',
          buildSystem(),
          '',
          buildActivity()
        ].join('\n');

      } else if (
        [
          'ayuda',
          'help',
          '?'
        ].includes(option)
      ) {
        response =
          buildHelp();

      } else {
        response = [
          buildHeader(),
          '',
          `❌ Opción desconocida: ${option}`,
          '',
          'Usa:',
          '`.infobot ayuda`'
        ].join('\n');
      }

      await sock.sendMessage(
        jid,
        {
          text: response
        }
      );

    } catch (error) {
      statistics.errorOccurred(
        error,
        {
          command:
            'infobot',
          jid
        }
      );

      console.error(
        '❌ Error en infobot:',
        error
      );

      try {
        await sock.sendMessage(
          jid,
          {
            text:
              '❌ No pude obtener la información completa del bot.'
          }
        );
      } catch {}
    }
  }
};