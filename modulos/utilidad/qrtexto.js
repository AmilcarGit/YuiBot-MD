//CÓDIGO ORIGINAL DE YUIBOT-MD
module.exports = {
  name: 'qrtexto',
  aliases: [],
  description: 'Convierte un texto en una imagen QR.',
  category: 'utilidad',
  async execute(sock, msg, args) {
    const jid = msg.key.remoteJid;
    const texto = args.join(' ').trim();

    if (!texto) {
      return sock.sendMessage(jid, {
        text: '❌ Escribe el texto que quieres convertir en QR.\n\nEjemplo: /qrtexto Hola YuiBot-MD'
      }, { quoted: msg });
    }

    if (texto.length > 2000) {
      return sock.sendMessage(jid, {
        text: '❌ El texto es demasiado largo. Usa un máximo de 2000 caracteres.'
      }, { quoted: msg });
    }

    try {
      const url = `https://api.qrserver.com/v1/create-qr-code/?size=800x800&margin=20&data=${encodeURIComponent(texto)}`;
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const buffer = Buffer.from(await response.arrayBuffer());

      await sock.sendMessage(jid, {
        image: buffer,
        caption: `╭─〔 🔳 QR DE TEXTO 〕\n│ 📝 ${texto.length} caracteres\n│ 📦 Generado por YuiBot-MD\n╰────────────────────`
      }, { quoted: msg });
    } catch (error) {
      await sock.sendMessage(jid, {
        text: '❌ No se pudo generar el código QR. Inténtalo nuevamente.'
      }, { quoted: msg });
    }
  }
};
