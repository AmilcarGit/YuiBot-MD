const os = require('os');
const fs = require('fs');
const path = require('path');
const statistics = require('./estadisticas');

function formatBytes(bytes) {
  if (!Number.isFinite(bytes)) {
    return '0 B';
  }

  const units = ['B', 'KB', 'MB', 'GB', 'TB'];

  let value = bytes;
  let index = 0;

  while (value >= 1024 && index < units.length - 1) {
    value /= 1024;
    index++;
  }

  return `${value.toFixed(index === 0 ? 0 : 2)} ${units[index]}`;
}

function formatUptime(seconds) {
  seconds = Math.floor(Number(seconds) || 0);

  const days = Math.floor(seconds / 86400);
  seconds %= 86400;

  const hours = Math.floor(seconds / 3600);
  seconds %= 3600;

  const minutes = Math.floor(seconds / 60);
  seconds %= 60;

  const parts = [];

  if (days) parts.push(`${days}d`);
  if (hours) parts.push(`${hours}h`);
  if (minutes) parts.push(`${minutes}m`);
  if (seconds || !parts.length) parts.push(`${seconds}s`);

  return parts.join(' ');
}

function formatDate(date = new Date()) {
  return new Intl.DateTimeFormat('es-PE', {
    dateStyle: 'full',
    timeStyle: 'medium',
    timeZone: 'America/Lima'
  }).format(date);
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

function countCommandFiles(directory, visited = new Set()) {
  if (!fs.existsSync(directory)) {
    return 0;
  }

  let total = 0;

  let realDirectory;

  try {
    realDirectory = fs.realpathSync(directory);
  } catch {
    return 0;
  }

  if (visited.has(realDirectory)) {
    return 0;
  }

  visited.add(realDirectory);

  let entries;

  try {
    entries = fs.readdirSync(directory, {
      withFileTypes: true
    });
  } catch {
    return 0;
  }

  for (const entry of entries) {
    const fullPath = path.join(directory, entry.name);

    if (entry.isDirectory()) {
      total += countCommandFiles(fullPath, visited);
      continue;
    }

    if (!entry.isFile()) {
      continue;
    }

    if (!entry.name.endsWith('.js')) {
      continue;
    }

    if (
      entry.name === 'main.js' ||
      entry.name === 'crear-comando.js' ||
      entry.name === 'estadisticas.js'
    ) {
      continue;
    }

    total++;
  }

  return total;
}

function countCommands() {
  const visited = new Set();
  let total = 0;

  for (const directory of getCommandDirectories()) {
    total += countCommandFiles(directory, visited);
  }

  return total;
}

function getBotName(sock) {
  try {
    const user = sock?.user;

    if (user?.name) {
      return user.name;
    }

    if (user?.verifiedName) {
      return user.verifiedName;
    }

    if (user?.id) {
      return user.id.split(':')[0];
    }
  } catch {}

  return 'YuiBot-MD';
}

function getConnectionStatus(sock) {
  try {
    if (!sock) {
      return '❌ Sin conexión';
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
    if (!sock?.groupFetchAllParticipating) {
      return {
        groups: 0,
        participants: 0
      };
    }

    const groups =
      await sock.groupFetchAllParticipating();

    const list = Object.values(groups || {});

    let participants = 0;

    for (const group of list) {
      participants += Array.isArray(group.participants)
        ? group.participants.length
        : 0;
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

function getSystemInfo() {
  const memory = process.memoryUsage();

  return {
    node: process.version,
    platform: process.platform,
    architecture: process.arch,
    pid: process.pid,
    cpu: os.cpus().length,
    cpuModel: os.cpus()[0]?.model || 'Desconocido',
    memory: memory.rss,
    totalMemory: os.totalmem(),
    freeMemory: os.freemem()
  };
}

function buildHeader() {
  return [
    '╭━━━〔 🤖 YUIBOT-MD 〕━━━╮',
    '┃ 📊 INFORMACIÓN EN TIEMPO REAL',
    '╰━━━━━━━━━━━━━━━━━━━━━━╯'
  ].join('\n');
}

function buildGeneralInfo(sock, groups) {
  const stats = statistics.getFormattedSnapshot();
  const system = getSystemInfo();

  return [
    buildHeader(),
    '',
    `🤖 Bot: ${getBotName(sock)}`,
    `📡 Estado: ${getConnectionStatus(sock)}`,
    `⏱️ Uptime: ${stats.uptimeFormatted}`,
    `📅 Fecha: ${formatDate()}`,
    '',
    '╭─〔 📈 ESTADÍSTICAS 〕',
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
    '╭─〔 💻 SISTEMA 〕',
    `│ 🟢 Node.js: ${system.node}`,
    `│ 🖥️ Plataforma: ${system.platform}`,
    `│ 🧩 Arquitectura: ${system.architecture}`,
    `│ ⚙️ CPU: ${system.cpu} núcleos`,
    `│ 🧠 RAM proceso: ${formatBytes(system.memory)}`,
    `│ 💾 RAM total: ${formatBytes(system.totalMemory)}`,
    `│ 📦 RAM libre: ${formatBytes(system.freeMemory)}`,
    `│ 🆔 PID: ${system.pid}`,
    '╰────────────────────'
  ].join('\n');
}

function buildCommandsInfo() {
  const stats = statistics.getFormattedSnapshot();
  const commandFiles = countCommands();

  const lines = [
    buildHeader(),
    '',
    '╭─〔 🧩 COMANDOS 〕',
    `│ 📁 Archivos detectados: ${commandFiles}`,
    `│ ⚡ Ejecutados: ${stats.commandsExecuted}`,
    '╰────────────────────',
    ''
  ];

  if (stats.topCommands.length) {
    lines.push('╭─〔 🔥 MÁS USADOS 〕');

    stats.topCommands.forEach((item, index) => {
      lines.push(
        `│ ${index + 1}. .${item.command} — ${item.count}`
      );
    });

    lines.push('╰────────────────────');
  } else {
    lines.push('📭 Todavía no hay comandos registrados.');
  }

  return lines.join('\n');
}

function buildActivityInfo() {
  const stats = statistics.getFormattedSnapshot();

  const lines = [
    buildHeader(),
    '',
    '╭─〔 ⚡ ACTIVIDAD RECIENTE 〕'
  ];

  if (!stats.activity.length) {
    lines.push('│ 📭 Sin actividad registrada.');
  } else {
    stats.activity.slice(0, 15).forEach(item => {
      const time = new Date(item.time).toLocaleTimeString(
        'es-PE',
        {
          timeZone: 'America/Lima',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit'
        }
      );

      let description = item.type;

      if (item.type === 'command') {
        description = `⚡ .${item.command}`;
      }

      if (item.type === 'message_received') {
        description = '📨 Mensaje recibido';
      }

      if (item.type === 'message_sent') {
        description = '📤 Mensaje enviado';
      }

      if (item.type === 'error') {
        description = '❌ Error';
      }

      if (item.type === 'restart') {
        description = '🔄 Reinicio';
      }

      if (item.type === 'reconnect') {
        description = '🔌 Reconexión';
      }

      if (item.type === 'connected') {
        description = '🟢 Conectado';
      }

      lines.push(`│ ${time} • ${description}`);
    });
  }

  lines.push('╰────────────────────');

  return lines.join('\n');
}

function buildSystemInfo() {
  const stats = statistics.getFormattedSnapshot();
  const system = getSystemInfo();

  return [
    buildHeader(),
    '',
    '╭─〔 💻 SISTEMA 〕',
    `│ 🟢 Node: ${system.node}`,
    `│ 🖥️ OS: ${system.platform}`,
    `│ 🧩 Arch: ${system.architecture}`,
    `│ ⚙️ CPU: ${system.cpu} núcleos`,
    `│ 🔧 Modelo: ${system.cpuModel}`,
    `│ 🧠 Proceso: ${stats.memoryFormatted.rss}`,
    `│ 📊 Heap usado: ${stats.memoryFormatted.heapUsed}`,
    `│ 📦 Heap total: ${stats.memoryFormatted.heapTotal}`,
    `│ 💾 RAM total: ${stats.memoryFormatted.systemTotal}`,
    `│ 🟢 RAM libre: ${stats.memoryFormatted.systemFree}`,
    `│ 🆔 PID: ${system.pid}`,
    '╰────────────────────'
  ].join('\n');
}

function buildHelp() {
  return [
    buildHeader(),
    '',
    '╭─〔 📖 USO 〕',
    '│ .infobot',
    '│ .infobot general',
    '│ .infobot comandos',
    '│ .infobot actividad',
    '│ .infobot sistema',
    '│ .infobot todo',
    '╰────────────────────',
    '',
    '📊 La información se obtiene al momento de ejecutar el comando.',
    '⚡ Las estadísticas se actualizan mientras el bot funciona.'
  ].join('\n');
}

async function buildAllInfo(sock) {
  const groups = await getGroups(sock);

  const general = buildGeneralInfo(sock, groups);
  const commands = buildCommandsInfo();
  const activity = buildActivityInfo();
  const system = buildSystemInfo();

  return [
    general,
    '',
    commands,
    '',
    system,
    '',
    activity
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
    'Muestra información y estadísticas del bot en tiempo real.',

  category: 'informacion',

  async execute(sock, msg, args) {
    const jid = msg?.key?.remoteJid;

    if (!jid) {
      return;
    }

    try {
      const option = args
        .join(' ')
        .trim()
        .toLowerCase();

      await sock.sendMessage(jid, {
        text: '⏳ Consultando información en tiempo real...'
      });

      let response;

      if (
        !option ||
        ['general', 'estado', 'status'].includes(option)
      ) {
        const groups = await getGroups(sock);
        response = buildGeneralInfo(sock, groups);
      } else if (
        ['comandos', 'commands', 'cmds'].includes(option)
      ) {
        response = buildCommandsInfo();
      } else if (
        ['actividad', 'activity', 'logs'].includes(option)
      ) {
        response = buildActivityInfo();
      } else if (
        ['sistema', 'system', 'server'].includes(option)
      ) {
        response = buildSystemInfo();
      } else if (
        ['todo', 'all', 'completo', 'full'].includes(option)
      ) {
        response = await buildAllInfo(sock);
      } else if (
        ['ayuda', 'help', '?'].includes(option)
      ) {
        response = buildHelp();
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

      await sock.sendMessage(jid, {
        text: response
      });

      statistics.messageSent({
        jid,
        type: 'infobot'
      });

    } catch (error) {
      statistics.errorOccurred(error, {
        command: 'infobot',
        jid
      });

      try {
        await sock.sendMessage(jid, {
          text: [
            '╭━━━〔 ❌ INFOBOT 〕━━━╮',
            '┃ No pude obtener toda',
            '┃ la información del bot.',
            '╰━━━━━━━━━━━━━━━━━━━━╯'
          ].join('\n')
        });

        statistics.messageSent({
          jid,
          type: 'infobot_error'
        });
      } catch {}
    }
  }
};