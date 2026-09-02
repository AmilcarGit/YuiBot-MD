const os = require('os');

const stats = {
  startedAt: Date.now(),
  restarts: 0,
  reconnections: 0,
  messagesReceived: 0,
  messagesSent: 0,
  commandsExecuted: 0,
  errors: 0,
  lastActivity: null,
  lastMessage: null,
  lastCommand: null,
  lastError: null,
  lastConnection: null,
  commandUsage: new Map(),
  activity: []
};

function timestamp() {
  return Date.now();
}

function addActivity(type, data = {}) {
  const activity = {
    type,
    time: timestamp(),
    ...data
  };

  stats.lastActivity = activity;
  stats.activity.unshift(activity);

  if (stats.activity.length > 50) {
    stats.activity.length = 50;
  }
}

function messageReceived(data = {}) {
  stats.messagesReceived++;

  stats.lastMessage = {
    time: timestamp(),
    ...data
  };

  addActivity('message_received', data);
}

function messageSent(data = {}) {
  stats.messagesSent++;

  addActivity('message_sent', data);
}

function commandExecuted(command, data = {}) {
  const name = String(command || 'desconocido')
    .trim()
    .toLowerCase();

  stats.commandsExecuted++;

  stats.commandUsage.set(
    name,
    (stats.commandUsage.get(name) || 0) + 1
  );

  stats.lastCommand = {
    command: name,
    time: timestamp(),
    ...data
  };

  addActivity('command', {
    command: name,
    ...data
  });
}

function errorOccurred(error, data = {}) {
  stats.errors++;

  const message =
    error?.message ||
    String(error || 'Error desconocido');

  stats.lastError = {
    message,
    time: timestamp(),
    ...data
  };

  addActivity('error', {
    message,
    ...data
  });
}

function registerRestart(data = {}) {
  stats.restarts++;

  addActivity('restart', data);
}

function registerReconnect(data = {}) {
  stats.reconnections++;

  stats.lastConnection = {
    type: 'reconnect',
    time: timestamp(),
    ...data
  };

  addActivity('reconnect', data);
}

function registerConnection(data = {}) {
  stats.lastConnection = {
    type: 'connected',
    time: timestamp(),
    ...data
  };

  addActivity('connected', data);
}

function getTopCommands(limit = 10) {
  return [...stats.commandUsage.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([command, count]) => ({
      command,
      count
    }));
}

function getCpu() {
  const cpus = os.cpus();

  if (!cpus.length) {
    return {
      cores: 0,
      model: 'Desconocido',
      speed: 0
    };
  }

  const speed =
    cpus.reduce(
      (total, cpu) => total + (cpu.speed || 0),
      0
    ) / cpus.length;

  return {
    cores: cpus.length,
    model: cpus[0]?.model || 'Desconocido',
    speed: Math.round(speed)
  };
}

function getMemory() {
  const memory = process.memoryUsage();

  return {
    rss: memory.rss,
    heapUsed: memory.heapUsed,
    heapTotal: memory.heapTotal,
    external: memory.external,
    arrayBuffers: memory.arrayBuffers || 0,
    systemTotal: os.totalmem(),
    systemFree: os.freemem()
  };
}

function getSnapshot() {
  return {
    uptime: process.uptime(),
    startedAt: stats.startedAt,
    restarts: stats.restarts,
    reconnections: stats.reconnections,
    messagesReceived: stats.messagesReceived,
    messagesSent: stats.messagesSent,
    commandsExecuted: stats.commandsExecuted,
    errors: stats.errors,
    lastActivity: stats.lastActivity,
    lastMessage: stats.lastMessage,
    lastCommand: stats.lastCommand,
    lastError: stats.lastError,
    lastConnection: stats.lastConnection,
    topCommands: getTopCommands(),
    activity: [...stats.activity],
    memory: getMemory(),
    cpu: getCpu(),
    node: {
      version: process.version,
      platform: process.platform,
      arch: process.arch,
      pid: process.pid
    }
  };
}

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

  if (seconds || !parts.length) {
    parts.push(`${seconds}s`);
  }

  return parts.join(' ');
}

function getFormattedSnapshot() {
  const snapshot = getSnapshot();

  return {
    ...snapshot,

    uptimeFormatted: formatUptime(snapshot.uptime),

    memoryFormatted: {
      rss: formatBytes(snapshot.memory.rss),
      heapUsed: formatBytes(snapshot.memory.heapUsed),
      heapTotal: formatBytes(snapshot.memory.heapTotal),
      external: formatBytes(snapshot.memory.external),
      systemTotal: formatBytes(snapshot.memory.systemTotal),
      systemFree: formatBytes(snapshot.memory.systemFree)
    }
  };
}

module.exports = {
  stats,
  messageReceived,
  messageSent,
  commandExecuted,
  errorOccurred,
  registerRestart,
  registerReconnect,
  registerConnection,
  getTopCommands,
  getSnapshot,
  getFormattedSnapshot,
  formatBytes,
  formatUptime
};