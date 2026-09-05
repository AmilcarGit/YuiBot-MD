//CÓDIGO ORIGINAL DE YUIBOT-MD
function getMessageBody(msg) {
  return (
    msg.message?.conversation ||
    msg.message?.extendedTextMessage?.text ||
    msg.message?.imageMessage?.caption ||
    msg.message?.videoMessage?.caption ||
    ''
  );
}

function parseCommand(body, { PREFIXES, ALLOW_NO_PREFIX }) {
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
    return { commandName: 'ia', args: [trimmed], usedPrefix: null };
  }

  return { commandName, args, usedPrefix: usedPrefix || null };
}

function isOwner(jid, { OWNERS }) {
  if (!jid) return false;
  const number = jid.split('@')[0].split(':')[0];
  return OWNERS.some((o) => o.numero === number);
}

module.exports = { getMessageBody, parseCommand, isOwner };
