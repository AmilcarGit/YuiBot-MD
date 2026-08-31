const fs = require('fs');
const path = require('path');

/**
 * Recorre modulos/ (y todas sus subcarpetas, ej: modulos/main/menu.js)
 * y devuelve la ruta de cada archivo .js encontrado.
 */
function findFilesRecursively(dir) {
  let files = [];

  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      files = files.concat(findFilesRecursively(fullPath));
    } else if (entry.isFile() && entry.name.endsWith('.js')) {
      files.push(fullPath);
    }
  }

  return files;
}

/**
 * Carga todos los comandos de la carpeta /modulos automáticamente,
 * sin importar en qué subcarpeta estén organizados (ej: modulos/main/menu.js).
 * Cada archivo debe exportar: { name, aliases, description, execute(sock, msg, args) }
 */
function loadCommands() {
  const modulosPath = path.join(__dirname, '..', 'modulos');
  const files = findFilesRecursively(modulosPath);

  const commands = new Map();

  for (const file of files) {
    const command = require(file);
    const relativePath = path.relative(modulosPath, file);

    if (!command.name || typeof command.execute !== 'function') {
      console.warn(`⚠️  Módulo inválido en ${relativePath}, se omite.`);
      continue;
    }

    commands.set(command.name, command);

    if (Array.isArray(command.aliases)) {
      for (const alias of command.aliases) {
        commands.set(alias, command);
      }
    }
  }

  console.log(`✅ ${files.length} módulo(s) cargado(s).`);
  return commands;
}

module.exports = { loadCommands };
