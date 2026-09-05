//CÓDIGO ORIGINAL DE YUIBOT-MD
const fs = require('fs');
const path = require('path');

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

function loadCommands(existingCommands, existingCategories) {
  const modulosPath = path.join(__dirname, '..', 'modulos');
  const files = findFilesRecursively(modulosPath);

  const commands = existingCommands || new Map();
  const categories = existingCategories || new Map();
  commands.clear();
  categories.clear();

  for (const file of files) {
    delete require.cache[require.resolve(file)];
    const command = require(file);
    const relativePath = path.relative(modulosPath, file);
    const category = relativePath.split(path.sep)[0];

    if (!command.name || typeof command.execute !== 'function') {
      console.warn(`⚠️  Módulo inválido en ${relativePath}, se omite.`);
      continue;
    }

    command.category = command.category || category;
    commands.set(command.name, command);

    if (Array.isArray(command.aliases)) {
      for (const alias of command.aliases) {
        commands.set(alias, command);
      }
    }

    if (!categories.has(command.category)) {
      categories.set(command.category, []);
    }
    categories.get(command.category).push(command);
  }

  global.__YUI_COMMANDS = commands;
  console.log(`✅ ${files.length} módulo(s) cargado(s).`);
  return { commands, categories };
}

module.exports = { loadCommands };