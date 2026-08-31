🌸 YuiBot-MD


<p align="center">
  <img
    src="https://i.postimg.cc/Dzks0qR5/Yui-Bot-MD-ezgif-com-video-to-gif-converter.gif"
    alt="YuiBot-MD"
    width="600"
  >
</p>


<p align="center">
  <img src="https://i.postimg.cc/Dzks0qR5/Yui-Bot-MD-ezgif-com-video-to-gif-converter.gif" alt="YuiBot-MD Demo" width="500">
</p><p align="center">
  <strong>Bot de WhatsApp Multi-Device desarrollado con Node.js y Baileys.</strong>
</p><p align="center">
  <a href="https://github.com/AmilcarGit/YuiBot-MD/stargazers">
    <img src="https://img.shields.io/github/stars/AmilcarGit/YuiBot-MD?style=for-the-badge" alt="Stars">
  </a>
  <a href="https://github.com/AmilcarGit/YuiBot-MD/network/members">
    <img src="https://img.shields.io/github/forks/AmilcarGit/YuiBot-MD?style=for-the-badge" alt="Forks">
  </a>
  <a href="https://github.com/AmilcarGit/YuiBot-MD/blob/main/LICENSE">
    <img src="https://img.shields.io/github/license/AmilcarGit/YuiBot-MD?style=for-the-badge" alt="License">
  </a>
  <a href="https://github.com/AmilcarGit/YuiBot-MD">
    <img src="https://img.shields.io/github/last-commit/AmilcarGit/YuiBot-MD?style=for-the-badge" alt="Last Commit">
  </a>
</p>---

🌱 Estado del proyecto

«🚧 YuiBot-MD está en sus primeras etapas de desarrollo.»

El proyecto recién comienza y actualmente se está construyendo una base sólida, modular y fácil de ampliar.

Nuevas funciones, comandos y mejoras se irán incorporando progresivamente.

Versión actual: "1.0.0"

Estado: 🚧 En desarrollo

---

📖 Sobre el proyecto

YuiBot-MD es un bot de WhatsApp Multi-Device desarrollado con Node.js y Baileys.

Su arquitectura está pensada para que los comandos puedan organizarse fácilmente dentro de "modulos/" y cargarse automáticamente.

También es posible organizar los comandos mediante subcarpetas, permitiendo mantener el proyecto ordenado a medida que crece.

🎯 Objetivos

YuiBot-MD busca convertirse progresivamente en un bot:

- 🧩 Modular
- ⚡ Rápido
- 🛠️ Fácil de personalizar
- 📂 Bien organizado
- 🔧 Fácil de mantener
- 🚀 Preparado para crecer

---

✨ Características actuales

Actualmente el proyecto cuenta con una base funcional que incluye:

- 📱 WhatsApp Multi-Device.
- 🔗 Vinculación mediante código QR.
- 💾 Persistencia de sesión.
- 🔄 Reconexión automática.
- 🧩 Sistema modular de comandos.
- 📂 Carga automática de comandos.
- 📁 Soporte para subcarpetas.
- 🏷️ Alias para comandos.
- ⚙️ Prefijo configurable.
- 🛡️ Manejo básico de errores.

«Estas son las funciones de la base actual. El proyecto continuará creciendo con nuevas características.»

---

🛠️ Tecnologías

Tecnología| Uso
🟢 Node.js| Entorno de ejecución
📱 Baileys| Conexión con WhatsApp
🟨 JavaScript| Lenguaje principal
📋 Pino| Sistema de logs
📷 QRCode Terminal| Generación del QR
🛡️ Hapi Boom| Manejo de errores
🔄 Nodemon| Desarrollo

---

📋 Requisitos

Antes de instalar YuiBot-MD necesitas:

- Node.js 18 o superior
- npm
- Una cuenta de WhatsApp
- Git, opcionalmente

Comprueba Node.js:

node -v

Comprueba npm:

npm -v

---

🚀 Instalación

1. Clonar el repositorio

git clone https://github.com/AmilcarGit/YuiBot-MD.git

2. Entrar al proyecto

cd YuiBot-MD

3. Instalar dependencias

npm install

4. Iniciar el bot

npm start

---

📱 Vincular WhatsApp

Al ejecutar el bot por primera vez aparecerá un código QR en la terminal.

Pasos

1. Abre WhatsApp.
2. Ve a Dispositivos vinculados.
3. Selecciona Vincular un dispositivo.
4. Escanea el código QR.
5. Espera a que el bot establezca la conexión.

Cuando la conexión sea exitosa aparecerá:

✅ Bot conectado a WhatsApp.

La sesión se guardará automáticamente en:

session/

Esto permite mantener la sesión para futuras ejecuciones.

«⚠️ Nunca compartas la carpeta "session/".»

---

⚙️ Configurar el prefijo

El prefijo predeterminado es:

!

Ejemplo:

!ping
!menu
!help

Puedes cambiarlo desde "main.js":

const PREFIX = '!';

Por ejemplo:

const PREFIX = '.';

Ahora los comandos serían:

.ping
.menu
.help

---

🧩 Sistema de comandos

Todos los comandos se encuentran dentro de:

modulos/

El sistema detecta automáticamente los archivos ".js", incluso si están dentro de subcarpetas.

Ejemplo:

modulos/
├── main/
│   ├── menu.js
│   ├── ping.js
│   └── help.js
│
├── herramientas/
│   └── info.js
│
└── grupo/
    └── admin.js

Esto permite organizar los comandos por categorías.

---

📝 Crear un comando

Crea un archivo dentro de "modulos/".

Ejemplo:

modulos/main/ping.js

Contenido:

module.exports = {
  name: 'ping',

  aliases: ['p'],

  description: 'Comprueba si el bot está funcionando.',

  async execute(sock, msg, args) {
    await sock.sendMessage(msg.key.remoteJid, {
      text: '🏓 Pong!'
    });
  }
};

Después puedes utilizar:

!ping

O su alias:

!p

---

🏷️ Propiedades de los comandos

Propiedad| Tipo| Obligatoria| Descripción
"name"| "string"| ✅| Nombre principal
"aliases"| "array"| ❌| Alias alternativos
"description"| "string"| ❌| Descripción
"execute"| "function"| ✅| Función que ejecuta el comando

Ejemplo mínimo

module.exports = {
  name: 'ping',

  async execute(sock, msg, args) {
    await sock.sendMessage(msg.key.remoteJid, {
      text: '🏓 Pong!'
    });
  }
};

---

📂 Estructura del proyecto

YuiBot-MD/
│
├── lib/
│   └── cargador.js
│
├── modulos/
│   └── main/
│       └── ...
│
├── session/
│   └── ...
│
├── main.js
├── package.json
├── LICENSE
└── README.md

📌 "main.js"

Archivo principal del bot.

Se encarga de iniciar Baileys, gestionar la conexión, recibir mensajes y ejecutar comandos.

📌 "lib/cargador.js"

Carga automáticamente los comandos encontrados dentro de "modulos/".

📌 "modulos/"

Contiene los comandos del bot.

📌 "session/"

Contiene las credenciales de la sesión de WhatsApp.

📌 "package.json"

Contiene las dependencias, información y scripts del proyecto.

---

🧪 Modo desarrollo

Para utilizar Nodemon:

npm run dev

Para ejecutar normalmente:

npm start

---

🔒 Seguridad

Nunca publiques información privada.

❌ No compartas:

session/

Tampoco publiques:

- API Keys.
- Tokens.
- Contraseñas.
- Credenciales de WhatsApp.
- Información privada.

Se recomienda utilizar:

node_modules/
session/
.env

en tu ".gitignore".

---

🐛 Reportar problemas

Si encuentras un error, puedes abrir un Issue en GitHub.

Incluye, si es posible:

1. Descripción del problema.
2. Comando que causa el error.
3. Error mostrado en la terminal.
4. Versión de Node.js.
5. Pasos para reproducirlo.

---

🤝 Contribuciones

YuiBot-MD recién está comenzando, por lo que las contribuciones son bienvenidas.

Puedes ayudar mediante:

- 🐛 Correcciones de errores.
- 🧩 Nuevos comandos.
- ⚡ Mejoras de rendimiento.
- 📚 Mejor documentación.
- 🔧 Mejoras de código.
- 💡 Nuevas ideas.

Proceso

1. Haz un Fork.
2. Crea una rama.
3. Realiza tus cambios.
4. Prueba el proyecto.
5. Envía un Pull Request.

Ejemplo:

git checkout -b feature/nuevo-comando

Después:

git add .
git commit -m "feat: agregar nuevo comando"
git push origin feature/nuevo-comando

---

🗺️ Roadmap

Como el proyecto recién comienza, el roadmap irá creciendo junto con YuiBot-MD.

🔹 Base

- [x] Conexión con WhatsApp
- [x] Vinculación mediante QR
- [x] Sistema de comandos
- [x] Cargador automático
- [x] Alias
- [x] Soporte para subcarpetas
- [x] Reconexión automática

🔸 Próximamente

- [ ] Menú dinámico
- [ ] Sistema de ayuda
- [ ] Categorías de comandos
- [ ] Más comandos
- [ ] Sistema de configuración
- [ ] Mejor manejo de errores
- [ ] Mejoras de rendimiento

🔮 Futuro

- [ ] Integración con APIs
- [ ] Más herramientas
- [ ] Funciones para grupos
- [ ] Sistema de plugins
- [ ] Nuevas opciones de administración
- [ ] Mejoras generales de arquitectura

«El roadmap puede cambiar a medida que avance el desarrollo.»

---

📊 Estado del desarrollo

YuiBot-MD

Base del bot       ██████████░░  En desarrollo
Sistema comandos   ████████░░░░  En desarrollo
Funciones          ███░░░░░░░░░  Inicial
Documentación      ███████░░░░░  En desarrollo

---

📄 Licencia

Este proyecto utiliza la Licencia MIT.

Consulta ""LICENSE"" (./LICENSE) para conocer los términos completos.

---

👤 Autor

AmilcarGit

GitHub:

https://github.com/AmilcarGit

Repositorio:

https://github.com/AmilcarGit/YuiBot-MD

---

⭐ Apoya el proyecto

YuiBot-MD apenas está comenzando.

Si te gusta el proyecto, puedes:

⭐ Dar una estrella al repositorio.

🐛 Reportar errores.

💡 Proponer nuevas funciones.

🧩 Crear nuevos comandos.

🤝 Contribuir mediante Pull Requests.

---

<p align="center">🌸 YuiBot-MD

Simple • Modular • Extensible

</p><p align="center">
  🚧 Proyecto en desarrollo — construido paso a paso.
</p>