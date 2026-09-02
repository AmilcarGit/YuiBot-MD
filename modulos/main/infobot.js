const fs = require('fs');
const path = require('path');
const os = require('os');

const COMMAND_CACHE_TIME = 30000;
let commandCache = {
  count: 0,
  categories: {},
  updated: 0
};

function formatBytes(bytes) {
  if (!Number.isFinite(bytes) || bytes < 0) return '0 B';

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
  const secs = seconds % 60;

  const parts = [];

  if (days) parts.push(`${days}d`);
  if (hours) parts.push(`${hours}h`);
  if (minutes) parts.push(`${minutes}m`);
  if (secs || !parts.length) parts.push(`${secs}s`);

  return parts.join(' ');
}

function getDateInfo() {
  const now = new Date();

  return {
    date: now.toLocaleDateString('es-PE', {
      timeZone: 'America/Lima',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    }),
    time: now.toLocaleTimeString('es-PE', {
      timeZone: 'America/Lima',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    })
  };
}

function getCpuUsage() {
  const cpus = os.cpus();

  if (!cpus || !cpus.length) {
    return {
      model: 'Desconocido',
      cores: 0,
      speed: 0
    };
  }

  const totalSpeed = cpus.reduce((sum, cpu) => sum + (cpu.speed || 0), 0);

  return {
    model: cpus[0]?.model || 'Desconocido',
    cores: cpus.length,
    speed: Math.round(totalSpeed / cpus.length)
  };
}

function getMemoryInfo() {
  const memory = process.memoryUsage();

  return {
    rss: memory.rss,
    heapUsed: memory.heapUsed,
    heapTotal: memory.heapTotal,
    external: memory.external,
    systemTotal: os.totalmem(),
    systemFree: os.freemem()
  };
}

function getMemoryPercent() {
  const total = os.totalmem();
  const free = os.freemem();

  if (!total) return 0;

  return ((total - free) / total) * 100;
}

function getNodeInfo() {
  return {
    version: process.version,
    platform: process.platform,
    arch: process.arch,
    pid: process.pid
  };
}

function getConnectionInfo(sock) {
  const connection =
    sock?.ws?.socket?.readyState === 1
      ? true
      : Boolean(sock?.user);

  let status = '🔴 DESCONOCIDO';

  if (connection) {
    status = '🟢 CONECTADO';
  }

  const user = sock?.user || {};

  const jid = user?.id || '';
  const name =
    user?.name ||
    user?.verifiedName ||
    'YuiBot-MD';

  return {
    connected: connection,
    status,
    jid,
    name
  };
}

async function getGroupsInfo(sock) {
  try {
    if (!sock || typeof sock.groupFetchAllParticipating !== 'function') {
      return {
        available: false,
        groups: 0,
        participants: 0
      };
    }

    const groups = await sock.groupFetchAllParticipating();
    const list = Object.values(groups || {});

    let participants = 0;

    for (const group of list) {
      if (Array.isArray(group?.participants)) {
        participants += group.participants.length;
      }
    }

    return {
      available: true,
      groups: list.length,
      participants
    };
  } catch {
    return {
      available: false,
      groups: 0,
      participants: 0
    };
  }
}

function findCommandDirectories() {
  const cwd = process.cwd();

  const candidates = [
    path.join(cwd, 'commands'),
    path.join(cwd, 'command'),
    path.join(cwd, 'plugins'),
    path.join(cwd, 'plugin'),
    path.join(cwd, 'src', 'commands'),
    path.join(cwd, 'src', 'command'),
    path.join(cwd, 'src', 'plugins'),
    path.join(cwd, 'src', 'plugin'),
    path.join(cwd, 'lib', 'commands'),
    path.join(cwd, 'lib', 'plugins')
  ];

  return candidates.filter(directory => {
    try {
      return fs.existsSync(directory) && fs.statSync(directory).isDirectory();
    } catch {
      return false;
    }
  });
}

function scanCommands(directory, result, visited) {
  if (!directory || visited.has(directory)) return;

  visited.add(directory);

  let entries;

  try {
    entries = fs.readdirSync(directory, {
      withFileTypes: true
    });
  } catch {
    return;
  }

  for (const entry of entries) {
    const fullPath = path.join(directory, entry.name);

    if (entry.name === 'node_modules') continue;
    if (entry.name.startsWith('.')) continue;

    if (entry.isDirectory()) {
      scanCommands(fullPath, result, visited);
      continue;
    }

    if (!entry.isFile()) continue;

    const extension = path.extname(entry.name).toLowerCase();

    if (!['.js', '.cjs', '.mjs'].includes(extension)) {
      continue;
    }

    try {
      const source = fs.readFileSync(fullPath, 'utf8');

      if (!/module\.exports\s*=/.test(source)) {
        continue;
      }

      if (
        !/name\s*:\s*['"`]/.test(source) &&
        !/name\s*:\s*`/.test(source)
      ) {
        continue;
      }

      const categoryMatch = source.match(
        /category\s*:\s*['"`]([^'"`]+)['"`]/
      );

      const category = categoryMatch
        ? categoryMatch[1].toLowerCase()
        : 'sin categoría';

      result.count++;
      result.categories[category] =
        (result.categories[category] || 0) + 1;
    } catch {}
  }
}

function getCommandInfo() {
  const now = Date.now();

  if (now - commandCache.updated < COMMAND_CACHE_TIME) {
    return commandCache;
  }

  const result = {
    count: 0,
    categories: {},
    updated: now
  };

  const directories = findCommandDirectories();
  const visited = new Set();

  for (const directory of directories) {
    scanCommands(directory, result, visited);
  }

  commandCache = result;

  return result;
}

function getCategoryText(categories) {
  const entries = Object.entries(categories || {});

  if (!entries.length) {
    return 'No disponible';
  }

  return entries
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([name, count]) => `${name}: ${count}`)
    .join(' • ');
}

function getLoadAverage() {
  const load = os.loadavg();

  if (!load || !load.length) {
    return 'No disponible';
  }

  return load
    .map(value => Number(value).toFixed(2))
    .join(' / ');
}

function getProcessInfo() {
  const usage = process.cpuUsage();

  const user = usage.user / 1000000;
  const system = usage.system / 1000000;

  return {
    user,
    system
  };
}

function getNetworkStatus(sock) {
  if (!sock) {
    return '🔴 No disponible';
  }

  if (sock.ws?.socket?.readyState === 1) {
    return '🟢 Activa';
  }

  if (sock.user) {
    return '🟢 Activa';
  }

  return '🟡 Desconocida';
}

function getBotName(sock) {
  return (
    sock?.user?.name ||
    sock?.user?.verifiedName ||
    'YuiBot-MD'
  );
}

function buildHeader(sock) {
  const connection = getConnectionInfo(sock);

  return [
    '╭━━━〔 🤖 YUIBOT-MD 〕━━━╮',
    `┃ ${connection.status}`,
    `┃ 👤 ${getBotName(sock)}`
  ];
}

function buildGeneral(info) {
  return [
    '╭━━━〔 🤖 INFOBOT 〕━━━╮',
    '┃',
    `┃ 🟢 Estado: ${info.connection.status}`,
    `┃ 📡 Conexión: ${info.network}`,
    `┃ ⚡ Latencia: ${info.latency} ms`,
    `┃`,
    `┃ ⏱️ Uptime: ${info.uptime}`,
    `┃ 📅 Fecha: ${info.date}`,
    `┃ 🕐 Hora: ${info.time}`,
    `┃`,
    `┃ 👥 Grupos: ${info.groups}`,
    `┃ 👤 Participantes: ${info.participants}`,
    `┃ 🧩 Comandos: ${info.commands}`,
    `┃`,
    `┃ 💾 RAM del proceso: ${formatBytes(info.memory.rss)}`,
    `┃ 🧠 Heap: ${formatBytes(info.memory.heapUsed)}`,
    `┃ 🖥️ RAM sistema: ${info.systemMemoryPercent.toFixed(1)}%`,
    '┃',
    `┃ 🟢 WhatsApp: ${info.network}`,
    '┃',
    '╰━━━━━━━━━━━━━━━━━━━━━━╯',
    '',
    'Usa:',
    '• .infobot todo',
    '• .infobot sistema',
    '• .infobot conexion',
    '• .infobot grupos'
  ].join('\n');
}

function buildSystem(info) {
  return [
    '╭━━━〔 🖥️ SISTEMA 〕━━━╮',
    '┃',
    `┃ 🤖 Bot: ${getBotName(info.sock)}`,
    `┃ ⏱️ Uptime: ${info.uptime}`,
    `┃`,
    `┃ 🟢 Node.js: ${info.node.version}`,
    `┃ 📦 PID: ${info.node.pid}`,
    `┃ 💻 SO: ${info.node.platform}`,
    `┃ 🏗️ Arquitectura: ${info.node.arch}`,
    `┃`,
    `┃ 🧠 CPU: ${info.cpu.model}`,
    `┃ 🔢 Núcleos: ${info.cpu.cores}`,
    `┃ ⚙️ Frecuencia: ${info.cpu.speed} MHz`,
    `┃ 📊 Carga: ${info.load}`,
    `┃`,
    `┃ 💾 RAM proceso: ${formatBytes(info.memory.rss)}`,
    `┃ 🧠 Heap usado: ${formatBytes(info.memory.heapUsed)}`,
    `┃ 🧠 Heap total: ${formatBytes(info.memory.heapTotal)}`,
    `┃ 📦 Externa: ${formatBytes(info.memory.external)}`,
    `┃`,
    `┃ 💽 RAM total: ${formatBytes(info.memory.systemTotal)}`,
    `┃ 🟢 RAM libre: ${formatBytes(info.memory.systemFree)}`,
    `┃ 📊 Uso RAM: ${info.systemMemoryPercent.toFixed(2)}%`,
    '┃',
    '╰━━━━━━━━━━━━━━━━━━━━━━╯'
  ].join('\n');
}

function buildConnection(info) {
  return [
    '╭━━━〔 📡 CONEXIÓN 〕━━━╮',
    '┃',
    `┃ 🟢 Estado: ${info.connection.status}`,
    `┃ 📶 WebSocket: ${info.network}`,
    `┃ ⚡ Latencia: ${info.latency} ms`,
    `┃`,
    `┃ 👤 Nombre: ${getBotName(info.sock)}`,
    `┃ 🆔 JID: ${info.connection.jid || 'No disponible'}`,
    `┃`,
    `┃ 📅 Fecha: ${info.date}`,
    `┃ 🕐 Hora: ${info.time}`,
    '┃',
    '╰━━━━━━━━━━━━━━━━━━━━━━╯'
  ].join('\n');
}

function buildGroups(info) {
  if (!info.groupAvailable) {
    return [
      '╭━━━〔 👥 GRUPOS 〕━━━╮',
      '┃',
      '┃ ⚠️ La información de grupos',
      '┃ no está disponible en este momento.',
      '┃',
      '╰━━━━━━━━━━━━━━━━━━━━━━╯'
    ].join('\n');
  }

  return [
    '╭━━━〔 👥 ESTADÍSTICAS 〕━━━╮',
    '┃',
    `┃ 👥 Grupos: ${info.groups}`,
    `┃ 👤 Participantes: ${info.participants}`,
    `┃ 📊 Promedio: ${info.groups > 0
      ? (info.participants / info.groups).toFixed(1)
      : '0'} usuarios/grupo`,
    '┃',
    `┃ 🧩 Comandos detectados: ${info.commands}`,
    '┃',
    '╰━━━━━━━━━━━━━━━━━━━━━━╯'
  ].join('\n');
}

function buildEverything(info) {
  const categoryText = getCategoryText(info.commandCategories);

  return [
    '╭━━━〔 🤖 YUIBOT-MD 〕━━━╮',
    '┃',
    `┃ 🟢 Estado: ${info.connection.status}`,
    `┃ 📡 WhatsApp: ${info.network}`,
    `┃ ⚡ Latencia: ${info.latency} ms`,
    `┃`,
    '┃ 📊 BOT',
    `┃ ⏱️ Uptime: ${info.uptime}`,
    `┃ 🧩 Comandos: ${info.commands}`,
    `┃ 👥 Grupos: ${info.groups}`,
    `┃ 👤 Participantes: ${info.participants}`,
    `┃`,
    '┃ 🖥️ SISTEMA',
    `┃ 🟢 Node: ${info.node.version}`,
    `┃ 💻 SO: ${info.node.platform}`,
    `┃ 🏗️ CPU: ${info.cpu.cores} núcleos`,
    `┃ ⚙️ CPU: ${info.cpu.speed} MHz`,
    `┃ 📊 Carga: ${info.load}`,
    `┃`,
    '┃ 💾 MEMORIA',
    `┃ RAM proceso: ${formatBytes(info.memory.rss)}`,
    `┃ Heap usado: ${formatBytes(info.memory.heapUsed)}`,
    `┃ Heap total: ${formatBytes(info.memory.heapTotal)}`,
    `┃ RAM sistema: ${info.systemMemoryPercent.toFixed(2)}%`,
    `┃`,
    '┃ 📚 CATEGORÍAS',
    `┃ ${categoryText}`,
    `┃`,
    `┃ 📅 ${info.date}`,
    `┃ 🕐 ${info.time}`,
    '┃',
    '╰━━━━━━━━━━━━━━━━━━━━━━╯'
  ].join('\n');
}

async function collectInfo(sock, startTime) {
  const connection = getConnectionInfo(sock);
  const memory = getMemoryInfo();
  const cpu = getCpuUsage();
  const node = getNodeInfo();
  const dateInfo = getDateInfo();
  const commandInfo = getCommandInfo();

  const groups = await getGroupsInfo(sock);

  const latency = Math.max(
    0,
    Date.now() - startTime
  );

  return {
    sock,
    connection,
    network: getNetworkStatus(sock),
    memory,
    cpu,
    node,
    groups: groups.groups,
    participants: groups.participants,
    groupAvailable: groups.available,
    commands: commandInfo.count,
    commandCategories: commandInfo.categories,
    uptime: formatUptime(process.uptime()),
    date: dateInfo.date,
    time: dateInfo.time,
    latency,
    load: getLoadAverage(),
    processCpu: getProcessInfo(),
    systemMemoryPercent: getMemoryPercent()
  };
}

function getMode(args) {
  const value = args
    .join(' ')
    .trim()
    .toLowerCase();

  if (
    ['todo', 'all', 'completo', 'full'].includes(value)
  ) {
    return 'todo';
  }

  if (
    ['sistema', 'system', 'server', 'servidor'].includes(value)
  ) {
    return 'sistema';
  }

  if (
    ['conexion', 'conexión', 'connection', 'red', 'network'].includes(value)
  ) {
    return 'conexion';
  }

  if (
    ['grupos', 'grupo', 'groups'].includes(value)
  ) {
    return 'grupos';
  }

  return 'general';
}

function buildHelp() {
  return [
    '╭━━━〔 🤖 INFOBOT 〕━━━╮',
    '┃',
    '┃ Comando de información',
    '┃ en tiempo real de YuiBot-MD.',
    '┃',
    '┃ 📌 USO',
    '┃ .infobot',
    '┃ .infobot todo',
    '┃ .infobot sistema',
    '┃ .infobot conexion',
    '┃ .infobot grupos',
    '┃',
    '┃ 📊 Muestra',
    '┃ • Estado de WhatsApp',
    '┃ • Latencia',
    '┃ • Uptime',
    '┃ • RAM',
    '┃ • CPU',
    '┃ • Node.js',
    '┃ • Sistema operativo',
    '┃ • Grupos',
    '┃ • Participantes',
    '┃ • Comandos',
    '┃ • Fecha y hora',
    '┃ • Estado WebSocket',
    '┃ • Categorías',
    '┃',
    '╰━━━━━━━━━━━━━━━━━━━━━━╯'
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
  description: 'Información avanzada y en tiempo real de YuiBot-MD.',
  category: 'informacion',

  async execute(sock, msg, args) {
    const jid = msg?.key?.remoteJid;

    if (!jid) {
      return;
    }

    const startTime = Date.now();

    try {
      const mode = getMode(args);

      if (
        args.length &&
        ['ayuda', 'help', '?'].includes(
          args.join(' ').trim().toLowerCase()
        )
      ) {
        await sock.sendMessage(jid, {
          text: buildHelp()
        });
        return;
      }

      await sock.sendMessage(jid, {
        text: '⏳ Consultando información en tiempo real...'
      });

      const info = await collectInfo(
        sock,
        startTime
      );

      let text;

      switch (mode) {
        case 'todo':
          text = buildEverything(info);
          break;

        case 'sistema':
          text = buildSystem(info);
          break;

        case 'conexion':
          text = buildConnection(info);
          break;

        case 'grupos':
          text = buildGroups(info);
          break;

        default:
          text = buildGeneral(info);
          break;
      }

      await sock.sendMessage(jid, {
        text
      });
    } catch (error) {
      try {
        await sock.sendMessage(jid, {
          text: [
            '╭━━━〔 🤖 INFOBOT 〕━━━╮',
            '┃',
            '┃ ❌ No pude obtener',
            '┃ toda la información.',
            '┃',
            `┃ 📌 ${error?.message || 'Error desconocido'}`,
            '┃',
            '╰━━━━━━━━━━━━━━━━━━━━━━╯'
          ].join('\n')
        });
      } catch {}
    }
  }
};