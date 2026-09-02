const MAX_EXPRESSION_LENGTH = 180;
const MAX_TOKENS = 80;
const MAX_HISTORY = 10;
const MAX_FACTORIAL = 170;
const histories = new Map();

const FUNCTIONS = new Set([
  'sqrt',
  'raiz',
  'abs',
  'sin',
  'cos',
  'tan',
  'asin',
  'acos',
  'atan',
  'log',
  'ln',
  'exp',
  'floor',
  'ceil',
  'round',
]);

const CONSTANTS = {
  pi: Math.PI,
  e: Math.E,
  tau: Math.PI * 2,
};

const HELP_TEXT = [
  '⛧───「 CALCULADORA 」───⛧',
  '',
  'Uso:',
  '• .calculadora 25 + 15',
  '• .calculadora (20 + 10) * 2',
  '• .calculadora 2^10',
  '• .calculadora √144',
  '• .calculadora sqrt(144)',
  '• .calculadora 50%',
  '',
  'Funciones:',
  '• sqrt(x) / raiz(x)',
  '• abs(x)',
  '• sin(x), cos(x), tan(x)',
  '• asin(x), acos(x), atan(x)',
  '• log(x), ln(x), exp(x)',
  '• floor(x), ceil(x), round(x)',
  '',
  'Constantes:',
  '• pi, e, tau',
  '',
  'Operadores:',
  '• +  -  *  /  ^  %',
  '• ( )',
  '',
  'Extras:',
  '• .calculadora ayuda',
  '• .calculadora historial',
  '• .calculadora limpiar',
].join('\n');

function normalizeExpression(input) {
  let expression = String(input || '').trim();

  expression = expression
    .replace(/[×✕]/g, '*')
    .replace(/[÷]/g, '/')
    .replace(/[−–—]/g, '-')
    .replace(/[π]/g, 'pi')
    .replace(/[√]/g, 'sqrt')
    .replace(/,/g, '.')
    .replace(/\s+/g, ' ');

  return expression;
}

function isSafeCharacter(char) {
  return /[0-9a-zA-Z_+\-*/^().%\s]/.test(char);
}

function validateCharacters(expression) {
  for (const char of expression) {
    if (!isSafeCharacter(char)) {
      throw new Error(`Carácter no permitido: "${char}"`);
    }
  }
}

function tokenize(expression) {
  const tokens = [];
  let index = 0;

  while (index < expression.length) {
    const char = expression[index];

    if (/\s/.test(char)) {
      index++;
      continue;
    }

    if (/[0-9.]/.test(char)) {
      const start = index;
      let hasDigits = false;
      let dots = 0;

      while (index < expression.length) {
        const current = expression[index];

        if (/[0-9]/.test(current)) {
          hasDigits = true;
          index++;
          continue;
        }

        if (current === '.') {
          dots++;

          if (dots > 1) {
            throw new Error('Número decimal inválido.');
          }

          index++;
          continue;
        }

        break;
      }

      const raw = expression.slice(start, index);

      if (!hasDigits || raw === '.') {
        throw new Error(`Número inválido: ${raw}`);
      }

      const value = Number(raw);

      if (!Number.isFinite(value)) {
        throw new Error('Número demasiado grande.');
      }

      tokens.push({
        type: 'number',
        value,
      });

      continue;
    }

    if (/[a-zA-Z_]/.test(char)) {
      const start = index;

      while (
        index < expression.length &&
        /[a-zA-Z_]/.test(expression[index])
      ) {
        index++;
      }

      const name = expression
        .slice(start, index)
        .toLowerCase();

      if (FUNCTIONS.has(name)) {
        tokens.push({
          type: 'function',
          value: name,
        });

        continue;
      }

      if (Object.prototype.hasOwnProperty.call(CONSTANTS, name)) {
        tokens.push({
          type: 'number',
          value: CONSTANTS[name],
        });

        continue;
      }

      throw new Error(`Nombre no reconocido: ${name}`);
    }

    if ('+-*/^%()'.includes(char)) {
      tokens.push({
        type: char,
        value: char,
      });

      index++;
      continue;
    }

    throw new Error(`Símbolo no reconocido: ${char}`);
  }

  if (!tokens.length) {
    throw new Error('No se encontró ninguna operación.');
  }

  if (tokens.length > MAX_TOKENS) {
    throw new Error('La operación es demasiado larga.');
  }

  return tokens;
}

class Parser {
  constructor(tokens) {
    this.tokens = tokens;
    this.position = 0;
  }

  current() {
    return this.tokens[this.position];
  }

  consume(type) {
    const token = this.current();

    if (!token || token.type !== type) {
      throw new Error(`Se esperaba "${type}".`);
    }

    this.position++;

    return token;
  }

  parse() {
    const result = this.parseAdditive();

    if (this.current()) {
      throw new Error(
        `Elemento inesperado: "${this.current().value}"`
      );
    }

    return result;
  }

  parseAdditive() {
    let value = this.parseMultiplicative();

    while (
      this.current()?.type === '+' ||
      this.current()?.type === '-'
    ) {
      const operator = this.current().type;

      this.position++;

      const right = this.parseMultiplicative();

      if (operator === '+') {
        value += right;
      } else {
        value -= right;
      }

      ensureFinite(value);
    }

    return value;
  }

  parseMultiplicative() {
    let value = this.parsePower();

    while (
      this.current()?.type === '*' ||
      this.current()?.type === '/' ||
      this.current()?.type === '%'
    ) {
      const operator = this.current().type;

      this.position++;

      const right = this.parsePower();

      if (operator === '*') {
        value *= right;
      }

      if (operator === '/') {
        if (right === 0) {
          throw new Error(
            'No se puede dividir entre cero.'
          );
        }

        value /= right;
      }

      if (operator === '%') {
        if (right === 0) {
          throw new Error(
            'No se puede calcular un módulo con cero.'
          );
        }

        value %= right;
      }

      ensureFinite(value);
    }

    return value;
  }

  parsePower() {
    let value = this.parseUnary();

    if (this.current()?.type === '^') {
      this.position++;

      const exponent = this.parsePower();

      value = Math.pow(value, exponent);

      ensureFinite(value);
    }

    return value;
  }

  parseUnary() {
    if (this.current()?.type === '+') {
      this.position++;

      return this.parseUnary();
    }

    if (this.current()?.type === '-') {
      this.position++;

      const value = this.parseUnary();

      const result = -value;

      ensureFinite(result);

      return result;
    }

    return this.parsePostfix();
  }

  parsePostfix() {
    let value = this.parsePrimary();

    while (this.current()?.type === '%') {
      this.position++;

      value /= 100;
    }

    return value;
  }

  parsePrimary() {
    const token = this.current();

    if (!token) {
      throw new Error(
        'Falta un número o una expresión.'
      );
    }

    if (token.type === 'number') {
      this.position++;

      return token.value;
    }

    if (token.type === '(') {
      this.position++;

      const value = this.parseAdditive();

      if (
        !this.current() ||
        this.current().type !== ')'
      ) {
        throw new Error(
          'Falta cerrar un paréntesis.'
        );
      }

      this.position++;

      return value;
    }

    if (token.type === 'function') {
      return this.parseFunction();
    }

    throw new Error(
      `Se esperaba un número, pero apareció "${token.value}".`
    );
  }

  parseFunction() {
    const functionName = this.current().value;

    this.position++;

    if (
      !this.current() ||
      this.current().type !== '('
    ) {
      throw new Error(
        `La función ${functionName} necesita paréntesis.`
      );
    }

    this.position++;

    const value = this.parseAdditive();

    if (
      !this.current() ||
      this.current().type !== ')'
    ) {
      throw new Error(
        `Falta cerrar la función ${functionName}().`
      );
    }

    this.position++;

    return applyFunction(functionName, value);
  }
}

function applyFunction(name, value) {
  let result;

  switch (name) {
    case 'sqrt':
    case 'raiz':
      if (value < 0) {
        throw new Error(
          'La raíz cuadrada de un número negativo no es real.'
        );
      }

      result = Math.sqrt(value);
      break;

    case 'abs':
      result = Math.abs(value);
      break;

    case 'sin':
      result = Math.sin(toRadians(value));
      break;

    case 'cos':
      result = Math.cos(toRadians(value));
      break;

    case 'tan':
      result = Math.tan(toRadians(value));
      break;

    case 'asin':
      if (value < -1 || value > 1) {
        throw new Error(
          'asin(x) requiere un valor entre -1 y 1.'
        );
      }

      result = toDegrees(Math.asin(value));
      break;

    case 'acos':
      if (value < -1 || value > 1) {
        throw new Error(
          'acos(x) requiere un valor entre -1 y 1.'
        );
      }

      result = toDegrees(Math.acos(value));
      break;

    case 'atan':
      result = toDegrees(Math.atan(value));
      break;

    case 'log':
      if (value <= 0) {
        throw new Error(
          'log(x) requiere un valor mayor que cero.'
        );
      }

      result = Math.log10(value);
      break;

    case 'ln':
      if (value <= 0) {
        throw new Error(
          'ln(x) requiere un valor mayor que cero.'
        );
      }

      result = Math.log(value);
      break;

    case 'exp':
      result = Math.exp(value);
      break;

    case 'floor':
      result = Math.floor(value);
      break;

    case 'ceil':
      result = Math.ceil(value);
      break;

    case 'round':
      result = Math.round(value);
      break;

    default:
      throw new Error(
        `Función no permitida: ${name}`
      );
  }

  ensureFinite(result);

  return result;
}

function toRadians(degrees) {
  return degrees * (Math.PI / 180);
}

function toDegrees(radians) {
  return radians * (180 / Math.PI);
}

function ensureFinite(value) {
  if (!Number.isFinite(value)) {
    throw new Error(
      'El resultado no es un número finito.'
    );
  }
}

function factorial(value) {
  if (!Number.isInteger(value)) {
    throw new Error(
      'El factorial requiere un número entero.'
    );
  }

  if (value < 0) {
    throw new Error(
      'El factorial no acepta números negativos.'
    );
  }

  if (value > MAX_FACTORIAL) {
    throw new Error(
      `El factorial está limitado a ${MAX_FACTORIAL}.`
    );
  }

  let result = 1;

  for (let i = 2; i <= value; i++) {
    result *= i;
  }

  return result;
}

function replaceFactorials(expression) {
  let result = expression;

  for (let pass = 0; pass < 10; pass++) {
    const match = result.match(
      /(\d+(?:\.\d+)?)!/
    );

    if (!match) {
      break;
    }

    const value = Number(match[1]);

    const replacement = String(
      factorial(value)
    );

    result =
      result.slice(0, match.index) +
      replacement +
      result.slice(
        match.index + match[0].length
      );
  }

  if (result.includes('!')) {
    throw new Error(
      'El factorial debe escribirse después de un número.'
    );
  }

  return result;
}

function calculate(rawExpression) {
  let expression = normalizeExpression(
    rawExpression
  );

  if (!expression) {
    throw new Error(
      'Escribe una operación.'
    );
  }

  if (
    expression.length >
    MAX_EXPRESSION_LENGTH
  ) {
    throw new Error(
      `La operación no puede superar ${MAX_EXPRESSION_LENGTH} caracteres.`
    );
  }

  expression = replaceFactorials(
    expression
  );

  validateCharacters(expression);

  const tokens = tokenize(expression);

  const parser = new Parser(tokens);

  const result = parser.parse();

  ensureFinite(result);

  return {
    expression,
    result,
  };
}

function formatNumber(value) {
  if (Object.is(value, -0)) {
    value = 0;
  }

  if (
    Number.isInteger(value) &&
    Math.abs(value) < 1e15
  ) {
    return value.toLocaleString('es-PE');
  }

  return Number(
    value.toPrecision(12)
  ).toLocaleString('es-PE', {
    maximumFractionDigits: 12,
  });
}

function getUserKey(msg) {
  return (
    msg?.key?.participantAlt ||
    msg?.key?.participant ||
    msg?.key?.remoteJid ||
    'unknown'
  );
}

function addHistory(
  userKey,
  expression,
  result
) {
  if (!histories.has(userKey)) {
    histories.set(userKey, []);
  }

  const history = histories.get(userKey);

  history.unshift({
    expression,
    result,
    date: new Date(),
  });

  if (history.length > MAX_HISTORY) {
    history.length = MAX_HISTORY;
  }
}

function getHistory(userKey) {
  return histories.get(userKey) || [];
}

function clearHistory(userKey) {
  histories.delete(userKey);
}

function formatHistory(history) {
  if (!history.length) {
    return '📭 No tienes operaciones guardadas en el historial.';
  }

  const lines = [
    '⛧───「 HISTORIAL 」───⛧',
    '',
  ];

  history.forEach((item, index) => {
    lines.push(
      `${index + 1}. ${item.expression} = ${formatNumber(item.result)}`
    );
  });

  return lines.join('\n');
}

function buildResultMessage(
  expression,
  result
) {
  return [
    '⛧───「 CALCULADORA 」───⛧',
    '',
    `🧮 Operación: ${expression}`,
    `✅ Resultado: *${formatNumber(result)}*`,
    '',
    'Usa .calculadora ayuda para ver las funciones disponibles.',
  ].join('\n');
}

function buildErrorMessage(error) {
  return [
    '⛧───「 CALCULADORA 」───⛧',
    '',
    '❌ No pude realizar la operación.',
    `📌 ${error.message}`,
    '',
    'Ejemplo:',
    '`.calculadora (25 + 15) * 2`',
  ].join('\n');
}

function buildInfoMessage() {
  return [
    '⛧───「 CALCULADORA 」───⛧',
    '',
    'Calculadora matemática segura de YuiBot-MD.',
    '',
    '✔️ Operaciones básicas',
    '✔️ Potencias',
    '✔️ Porcentajes',
    '✔️ Raíces',
    '✔️ Funciones trigonométricas',
    '✔️ Logaritmos',
    '✔️ Constantes matemáticas',
    '✔️ Historial por usuario',
    '✔️ Sin eval()',
    '',
    'Escribe `.calculadora ayuda` para ver todos los comandos.',
  ].join('\n');
}

function parseSpecialCommand(args) {
  const command = args
    .join(' ')
    .trim()
    .toLowerCase();

  if (
    ['ayuda', 'help', '?'].includes(command)
  ) {
    return 'help';
  }

  if (
    ['historial', 'history'].includes(command)
  ) {
    return 'history';
  }

  if (
    ['limpiar', 'clear', 'borrar'].includes(command)
  ) {
    return 'clear';
  }

  if (
    ['info', 'about'].includes(command)
  ) {
    return 'info';
  }

  return null;
}

function validateParentheses(expression) {
  let balance = 0;

  for (const char of expression) {
    if (char === '(') {
      balance++;
    }

    if (char === ')') {
      balance--;

      if (balance < 0) {
        throw new Error(
          'Hay un paréntesis de cierre sin pareja.'
        );
      }
    }
  }

  if (balance !== 0) {
    throw new Error(
      'Los paréntesis no están equilibrados.'
    );
  }
}

function isSuspiciousExpression(expression) {
  const forbiddenPatterns = [
    /__proto__/i,
    /constructor/i,
    /prototype/i,
    /javascript/i,
    /require/i,
    /process/i,
    /global/i,
    /import/i,
    /export/i,
  ];

  return forbiddenPatterns.some(
    (pattern) => pattern.test(expression)
  );
}

function prepareExpression(args) {
  const expression = args.join(' ').trim();

  if (!expression) {
    throw new Error(
      'Falta la operación.'
    );
  }

  if (isSuspiciousExpression(expression)) {
    throw new Error(
      'La expresión contiene texto no permitido.'
    );
  }

  validateParentheses(expression);

  return expression;
}

module.exports = {
  name: 'calculadora',

  aliases: [
    'calc',
    'calcular',
  ],

  description:
    'Calculadora matemática segura con funciones e historial.',

  category: 'utilidad',

  async execute(sock, msg, args) {
    const jid = msg.key.remoteJid;
    const userKey = getUserKey(msg);

    try {
      const special = parseSpecialCommand(args);

      if (special === 'help') {
        await sock.sendMessage(jid, {
          text: HELP_TEXT,
        });

        return;
      }

      if (special === 'info') {
        await sock.sendMessage(jid, {
          text: buildInfoMessage(),
        });

        return;
      }

      if (special === 'history') {
        const history = getHistory(userKey);

        await sock.sendMessage(jid, {
          text: formatHistory(history),
        });

        return;
      }

      if (special === 'clear') {
        clearHistory(userKey);

        await sock.sendMessage(jid, {
          text: '🗑️ Tu historial de calculadora fue limpiado correctamente.',
        });

        return;
      }

      const expression =
        prepareExpression(args);

      const calculation =
        calculate(expression);

      addHistory(
        userKey,
        calculation.expression,
        calculation.result
      );

      await sock.sendMessage(jid, {
        text: buildResultMessage(
          calculation.expression,
          calculation.result
        ),
      });
    } catch (error) {
      await sock.sendMessage(jid, {
        text: buildErrorMessage(error),
      });
    }
  },
};