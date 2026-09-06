//CÓDIGO ORIGINAL DE YUIBOT-MD
module.exports = {
  name: 'codigoqr',
  aliases: [],
  description: 'Genera un código QR para enlaces y códigos.',
  category: 'utilidad',
  async execute(sock, msg, args) {
    const jid = msg.key.remoteJid;
    const codigo = args.join(' ').trim();

    if (!codigo) {
      return sock.sendMessage(jid, {
        text: '❌ Escribe un enlace o código para convertirlo en QR.\n\nEjemplo: /codigoqr https://github.com/AmilcarGit/YuiBot-MD'
      }, { quoted: msg });
    }

    if (codigo.length > 2000) {
      return sock.sendMessage(jid, {
        text: '❌ El enlace o código es demasiado largo. Usa un máximo de 2000 caracteres.'
      }, { quoted: msg });
    }

    try {
      const url = `https://api.qrserver.com/v1/create-qr-code/?size=800x800&margin=20&data=${encodeURIComponent(codigo)}`;
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const buffer = Buffer.from(await response.arrayBuffer());

      await sock.sendMessage(jid, {
        image: buffer,
        caption: `╭─〔 🔳 CÓDIGO QR 〕\n│ 🔗 ${codigo.length} caracteres\n│ 📦 Generado por YuiBot-MD\n╰────────────────────`
      }, { quoted: msg });
    } catch (error) {
      await sock.sendMessage(jid, {
        text: '❌ No se pudo generar el código QR. Inténtalo nuevamente.'
      }, { quoted: msg });
    }
  }
};
