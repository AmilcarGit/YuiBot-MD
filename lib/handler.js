//CÓDIGO ORIGINAL DE YUIBOT-MD
function getMessageBody(msg) {
  return (
    msg.message?.conversation ||
    msg.message?.extendedTextMessage?.text ||
    msg.message?.imageMessage?.caption ||
    msg.message?.videoMessage?.caption ||
    msg.message?.buttonsResponseMessage?.selectedButtonId ||
    msg.message?.templateButtonReplyMessage?.selectedId ||
    msg.message?.listResponseMessage?.singleSelectReply?.selectedRowId ||
    obtenerRespuestaInteractiva(msg) ||
    ''
  );
}

function obtenerRespuestaInteractiva(msg) {
  const raw = msg.message?.interactiveResponseMessage?.nativeFlowResponseMessage?.paramsJson;
  if (!raw) return '';
  try {
    const data = JSON.parse(raw);
    return data.id || data.selectedId || data.button_id || '';
  } catch {
    return '';
  }
}

function parseCommand(body, { PREFIXES, ALLOW_NO_PREFIX, IA_ENABLED = true }) {
  if (!body) return null;

  const trimmed = body.trim();
  if (!trimmed) return null;

  const usedPrefix = PREFIXES.find((p) => trimmed.startsWith(p));

  let content = null;

  if (usedPrefix) {
    content = trimmed.slice(usedPrefix.length).trim();
  } else if (ALLOW_NO_PREFIX) {
    content = trimmed;
  }

  if (content === null || content === '') return null;

  const args = content.split(/\s+/);
  const commandName = args.shift().toLowerCase();

  if (!usedPrefix && (!global.__YUI_COMMANDS || !global.__YUI_COMMANDS.has(commandName))) {
    if (!IA_ENABLED) return null;
    return { commandName: 'ia', args: [trimmed], usedPrefix: null };
  }

  return { commandName, args, usedPrefix: usedPrefix || null };
}

function normalizarNumero(jid) {
  if (!jid) return '';
  return String(jid).split('@')[0].split(':')[0].replace(/[^0-9]/g, '');
}

function isOwner(jid, { OWNERS }) {
  if (!jid || !Array.isArray(OWNERS)) return false;
  const numero = normalizarNumero(jid);
  if (!numero) return false;
  return OWNERS.some((owner) => normalizarNumero(owner.numero) === numero);
}

module.exports = { getMessageBody, parseCommand, isOwner };
