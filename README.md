🌸 YuiBot-MD

<p align="center">
  <img src="https://files.catbox.moe/t48q5g.gif" alt="YuiBot-MD Demo" width="500">
</p><p align="center">
  <strong>Bot de WhatsApp Multi-Device desarrollado con Node.js y Baileys.</strong>
</p><p align="center">
  <a href="https://github.com/AmilcarGit/YuiBot-MD">
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

«YuiBot-MD está en sus primeras etapas de desarrollo.»

Este proyecto recién comienza y actualmente se está construyendo una base modular sobre la cual se irán incorporando nuevas funciones, comandos y mejoras.

La idea es mantener el proyecto simple, organizado y fácil de ampliar.

🚧 En desarrollo

---

📖 Sobre el proyecto

YuiBot-MD es un bot de WhatsApp Multi-Device creado con Node.js y Baileys.

El proyecto utiliza un sistema modular que permite agregar comandos dentro de la carpeta "modulos/" sin tener que modificar constantemente el archivo principal.

Los módulos también pueden organizarse utilizando subcarpetas.

🎯 Objetivos

El proyecto busca convertirse progresivamente en un bot:

- 🧩 Modular
- ⚡ Rápido
- 🛠️ Fácil de personalizar
- 📂 Bien organizado
- 🔧 Fácil de mantener
- 🚀 Preparado para crecer

---

✨ Características actuales

Actualmente YuiBot-MD cuenta con una base funcional que incluye:

- 📱 Conexión con WhatsApp Multi-Device.
- 🔗 Vinculación mediante código QR.
- 💾 Persistencia de sesión.
- 🔄 Reconexión automática.
- 🧩 Sistema modular de comandos.
- 📂 Carga automática de comandos.
- 📁 Soporte para subcarpetas.
- 🏷️ Alias para comandos.
- ⚙️ Prefijo configurable.
- 🟢 Manejo básico de errores.

«Estas funciones corresponden a la base actual del proyecto. Se irán añadiendo nuevas características progresivamente.»

---

🛠️ Tecnologías

YuiBot-MD utiliza:

Tecnología| Función
Node.js| Entorno de ejecución
Baileys| Comunicación con WhatsApp
JavaScript| Lenguaje principal
Pino| Sistema de logs
QRCode Terminal| Generación del QR
Hapi Boom| Manejo de errores
Nodemon| Desarrollo

---

📋 Requisitos

Antes de instalar el proyecto necesitas:

- Node.js 18 o superior
- npm
- Una cuenta de WhatsApp
- Git, opcionalmente para clonar el proyecto

Comprueba Node.js:

node -v

Comprueba npm:

npm -v

---

🚀 Instalación

1. Clonar el repositorio

git clone https://github.com/AmilcarGit/YuiBot-MD.git

2. Entrar en la carpeta

cd YuiBot-MD

3. Instalar dependencias

npm install

4. Iniciar el bot

npm start

---

📱 Vincular WhatsApp

Al iniciar el bot por primera vez, aparecerá un código QR en la terminal.

Desde WhatsApp:

1. Abre WhatsApp.
2. Ve a Dispositivos vinculados.
3. Pulsa Vincular un dispositivo.
4. Escanea el QR mostrado por el bot.
5. Espera a que se establezca la conexión.

Cuando se conecte correctamente aparecerá:

✅ Bot conectado a WhatsApp.

La sesión se guarda en:

session/

Esto permite mantener la sesión para futuras ejecuciones.

«⚠️ No compartas nunca la carpeta "session/".»

---

⚙️ Prefijo

El prefijo actual del bot es:

!

Por ejemplo:

!ping

El prefijo puede modificarse desde "main.js":

const PREFIX = '!';

Puedes cambiarlo, por ejemplo, a:

const PREFIX = '.';

Y entonces utilizar:

.ping

---

🧩 Sistema de comandos

Los comandos se encuentran dentro de:

modulos/

El cargador busca automáticamente archivos ".js", incluso dentro de subcarpetas.

Ejemplo:

modulos/
├── main/
│   ├── menu.js
│   └── ping.js
│
├── herramientas/
│   └── info.js
│
└── grupo/
    └── admin.js

Esto permite mantener los comandos organizados por categorías.

---

📝 Crear tu primer comando

Crea:

modulos/main/ping.js

Y coloca:

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

Después ejecuta:

!ping

También podrás utilizar:

!p

porque "p" está definido como alias.

---

🏷️ Propiedades de los comandos

Cada comando puede utilizar:

Propiedad| Tipo| Obligatoria| Descripción
"name"| "string"| ✅| Nombre del comando
"aliases"| "array"| ❌| Alias del comando
"description"| "string"| ❌| Descripción
"execute"| "function"| ✅| Código que ejecuta el comando

Ejemplo mínimo:

module.exports = {
  name: 'ping',

  async execute(sock, msg, args) {
    await sock.sendMessage(msg.key.remoteJid, {
      text: '🏓 Pong!'
    });
  }
};

---

📂 Estructura

La estructura actual del proyecto es:

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

"main.js"

Archivo principal encargado de iniciar el bot y gestionar la conexión con WhatsApp.

"lib/cargador.js"

Sistema encargado de encontrar y cargar automáticamente los comandos.

"modulos/"

Aquí se encuentran los comandos del bot.

"session/"

Contiene la sesión de WhatsApp generada durante la vinculación.

"package.json"

Contiene la información del proyecto, scripts y dependencias.

---

🧪 Modo desarrollo

Para ejecutar el bot utilizando Nodemon:

npm run dev

Esto permite reiniciar automáticamente el proceso cuando se realizan cambios durante el desarrollo.

Para ejecutar normalmente:

npm start

---

🔒 Seguridad

Nunca publiques información privada.

❌ No compartas:

session/

Ni publiques:

- Credenciales de WhatsApp.
- Tokens.
- API Keys.
- Contraseñas.
- Información privada.

Se recomienda utilizar ".gitignore":

node_modules/
session/
.env

---

🐛 Reportar errores

Si encuentras un problema, puedes abrir un Issue en GitHub.

Procura incluir:

1. Qué estabas haciendo.
2. Qué comando produjo el error.
3. El mensaje mostrado en la terminal.
4. Tu versión de Node.js.
5. Los pasos para reproducir el problema.

Esto ayudará a solucionar los problemas más rápidamente.

---

🤝 Contribuciones

YuiBot-MD recién está comenzando, por lo que las contribuciones pueden ayudar mucho al crecimiento del proyecto.

Puedes contribuir mediante:

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
4. Prueba el código.
5. Envía un Pull Request.

Ejemplo:

git checkout -b feature/nuevo-comando

Después:

git add .
git commit -m "feat: agregar nuevo comando"
git push origin feature/nuevo-comando

---

🗺️ Roadmap

El proyecto se encuentra en una etapa inicial.

Algunas mejoras que podrían incorporarse progresivamente:

🔹 Base

- [x] Conexión con WhatsApp
- [x] Sistema de comandos
- [x] Cargador automático
- [x] Alias
- [x] Soporte para subcarpetas
- [x] Reconexión automática

🔸 Próximamente

- [ ] Sistema de ayuda
- [ ] Menú dinámico
- [ ] Sistema de categorías
- [ ] Más comandos
- [ ] Sistema de configuración
- [ ] Mejor manejo de errores
- [ ] Mejoras de rendimiento

🔮 Futuro

- [ ] Más herramientas
- [ ] Sistemas adicionales
- [ ] Integración con APIs
- [ ] Nuevas funciones para grupos
- [ ] Sistema de plugins
- [ ] Mejoras de administración

«El roadmap puede cambiar conforme evolucione el proyecto.»

---

📊 Estado

YuiBot-MD
│
├── 🟢 Base del bot       ██████████░░
├── 🟡 Comandos           ███░░░░░░░░
├── 🟡 Funciones          ██░░░░░░░░░
└── 🔵 Desarrollo         ██████████░░

Versión actual: "1.0.0"

Estado: 🚧 En desarrollo

---

📄 Licencia

Este proyecto utiliza la Licencia MIT.

Consulta el archivo ""LICENSE"" (./LICENSE) para conocer los términos completos.

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

Si te gusta el proyecto, puedes ayudar dejando una ⭐ en GitHub y compartiéndolo con otros desarrolladores.

Cada contribución ayuda a que el proyecto pueda seguir creciendo.

---

<p align="center">🌸 YuiBot-MD

Simple • Modular • En desarrollo

</p><p align="center">
  Construyendo el proyecto paso a paso. 🚀
</p>