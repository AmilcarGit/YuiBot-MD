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

  // Hooks: módulos que se ejecutan en cada evento (mensaje, cambio de
  // grupo, borrado), en vez de responder solo a un comando explícito.
  // Un módulo puede ser un comando normal, un hook puro, o ambas cosas
  // a la vez (ej: un "antilink" que además tiene un comando ".antilink"
  // para configurarlo). onMessageDelete queda declarado para cuando se
  // porte el primer módulo que lo use (ej. antidelete); todavía no hay
  // ningún listener de evento conectado a él.
  const hooks = { onMessage: [], onGroupUpdate: [], onMessageDelete: [] };

  for (const file of files) {
    delete require.cache[require.resolve(file)];
    const command = require(file);
    const relativePath = path.relative(modulosPath, file);
    const category = relativePath.split(path.sep)[0];

    const esComando = Boolean(command.name) && typeof command.execute === 'function';
    const tieneHooks = ['onMessage', 'onGroupUpdate', 'onMessageDelete'].some(
      (hookName) => typeof command[hookName] === 'function'
    );

    if (!esComando && !tieneHooks) {
      console.warn(`⚠️  Módulo inválido en ${relativePath} (no tiene "name"+"execute" ni ningún hook), se omite.`);
      continue;
    }

    const etiqueta = command.name || relativePath;

    for (const hookName of Object.keys(hooks)) {
      if (typeof command[hookName] === 'function') {
        hooks[hookName].push({ fn: command[hookName], label: etiqueta });
      }
    }

    if (!esComando) continue; // hook puro, sin comando de chat asociado

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
  return { commands, categories, hooks };
}

/**
 * Ejecuta una lista de hooks en orden, aislando errores: si un hook
 * revienta, se loguea y se sigue con los demás (uno mal portado no debe
 * tumbar el mensaje completo ni a los otros hooks).
 */
async function ejecutarHooks(lista, ...args) {
  for (const hook of lista) {
    try {
      await hook.fn(...args);
    } catch (error) {
      console.error(`[HOOKS] Error en "${hook.label}":`, error);
    }
  }
}

module.exports = { loadCommands, ejecutarHooks };