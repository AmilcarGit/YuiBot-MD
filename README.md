<div align="center">

  <img src="https://raw.githubusercontent.com/AmilcarGit/YuiBot-MD/main/media/menu1.gif"
       alt="YuiBot-MD Preview"
       width="350"/>

  <h1>🌸 YuiBot-MD</h1>

  <p>
    <b>Un bot de WhatsApp Multi-Device moderno, escalable y fácil de personalizar</b>
  </p>

  <p>
    <a href="#-características">Características</a> •
    <a href="#-instalación">Instalación</a> •
    <a href="#-uso">Uso</a> •
    <a href="#-comandos">Comandos</a> •
    <a href="#-contribuir">Contribuir</a>
  </p>

  <br>

  [![GitHub Stars](https://img.shields.io/github/stars/AmilcarGit/YuiBot-MD?style=for-the-badge&logo=github&logoColor=white)](https://github.com/AmilcarGit/YuiBot-MD/stargazers)
  [![GitHub Forks](https://img.shields.io/github/forks/AmilcarGit/YuiBot-MD?style=for-the-badge&logo=github&logoColor=white)](https://github.com/AmilcarGit/YuiBot-MD/network/members)
  [![Node.js](https://img.shields.io/badge/Node.js-18+-339933?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org/)
  [![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)](LICENSE)

</div>

---

## 📌 Descripción

**YuiBot-MD** es un bot de WhatsApp desarrollado con **Node.js** y **Baileys** que utiliza la conexión Multi-Device para máxima compatibilidad y estabilidad. 

El proyecto está diseñado con una arquitectura **modular, escalable y de fácil personalización**, permitiendo que tanto principiantes como desarrolladores experimentados puedan crear y gestionar sus propios comandos sin complicaciones.

> 🚀 **Estado del Proyecto:** En desarrollo activo
> 
> Estamos mejorando continuamente el bot con nuevos comandos, herramientas y funcionalidades.

---

## ✨ Características Principales

<table>
  <tr>
    <td>📱 <b>Multi-Device</b></td>
    <td>Conexión nativa de WhatsApp Multi-Device para máxima compatibilidad</td>
  </tr>
  <tr>
    <td>🔗 <b>Autenticación QR</b></td>
    <td>Escanea un código QR para conectar de forma segura</td>
  </tr>
  <tr>
    <td>💾 <b>Sesión Persistente</b></td>
    <td>Guarda la sesión automáticamente para reconexiones rápidas</td>
  </tr>
  <tr>
    <td>🧩 <b>Sistema Modular</b></td>
    <td>Estructura de comandos organizada y fácil de extender</td>
  </tr>
  <tr>
    <td>⚙️ <b>Configurable</b></td>
    <td>Personaliza prefijos, nombres de usuario y más</td>
  </tr>
  <tr>
    <td>🔄 <b>Reconexión Automática</b></td>
    <td>Manejo inteligente de desconexiones</td>
  </tr>
  <tr>
    <td>🏷️ <b>Aliases de Comandos</b></td>
    <td>Define múltiples formas de ejecutar el mismo comando</td>
  </tr>
  <tr>
    <td>🚀 <b>Fácil de Expandir</b></td>
    <td>Crea nuevos comandos en minutos sin modificar el core</td>
  </tr>
</table>

---

## 🛠️ Tecnologías Utilizadas

<div align="center">

[![Node.js](https://img.shields.io/badge/Node.js-18+-339933?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org/)
[![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)](https://www.javascript.com/)
[![Baileys](https://img.shields.io/badge/Baileys-25D366?style=for-the-badge&logo=whatsapp&logoColor=white)](https://github.com/WhiskeySockets/Baileys)

</div>

---

## 📋 Requisitos Previos

Antes de instalar YuiBot-MD, asegúrate de tener:

- **Node.js 18 o superior** ([Descargar](https://nodejs.org/))
- **npm** (incluido con Node.js)
- **Git** ([Descargar](https://git-scm.com/))
- Una cuenta de **WhatsApp activa**

### Verificar instalación

```bash
node -v      # Debe mostrar v18.0.0 o superior
npm -v       # Debe mostrar 8.0.0 o superior
git --version
```

---

## 🚀 Instalación Rápida

### 1. Clonar el repositorio

```bash
git clone https://github.com/AmilcarGit/YuiBot-MD.git
cd YuiBot-MD
```

### 2. Instalar dependencias

```bash
npm install
```

### 3. Ejecutar el bot

```bash
npm start
```

### 4. Escanear el código QR

El bot mostrará un código QR en la terminal. Escanéalo con tu celular usando WhatsApp para autenticar.

> 💡 **Consejo:** Utiliza `npm run dev` para ejecutar en modo desarrollo con auto-recarga.

---

## 📖 Uso Básico

Una vez que el bot esté corriendo y autenticado:

1. Envía un mensaje a un chat (privado, grupo, etc.)
2. Usa el prefijo configurado (por defecto: `.`) seguido del nombre del comando
3. El bot responderá con la acción correspondiente

**Ejemplo:**
```
Usuario: .ping
Bot: 🏓 Pong!
```

---

## 📂 Estructura del Proyecto

```
YuiBot-MD/
├── main.js                 # Archivo principal
├── package.json           # Dependencias y scripts
├── media/                 # Recursos multimedia
│   └── menu1.gif         # Preview del bot
├── commands/             # 📂 Comandos del bot
│   ├── general/          # Comandos generales
│   ├── admin/            # Comandos de administrador
│   └── fun/              # Comandos de diversión
├── utils/                # Funciones auxiliares
└── config/               # Configuración global
```

---

## 💡 Crear tu Primer Comando

### Estructura básica de un comando:

```javascript
// commands/general/saludo.js

module.exports = {
  name: 'saludo',
  alias: ['hola', 'hi'],
  description: 'Saluda al usuario',
  
  async execute(socket, msg, args) {
    await msg.reply('¡Hola! 👋 Bienvenido a YuiBot-MD');
  }
};
```

### Parámetros disponibles:
- **socket**: Instancia del bot
- **msg**: Objeto del mensaje recibido
- **args**: Argumentos pasados al comando

---

## 📜 Comandos Disponibles

| Comando | Descripción | Uso |
|---------|-------------|-----|
| `.ping` | Verifica si el bot está activo | `.ping` |
| `.menu` | Muestra el menú principal | `.menu` |
| `.info` | Información del bot y sistema | `.info` |
| `.help` | Ayuda sobre comandos disponibles | `.help [comando]` |

*Más comandos están siendo desarrollados...*

---

## ⚙️ Configuración

### Variables de Entorno

Crea un archivo `.env` en la raíz del proyecto:

```env
# Configuración del Bot
BOT_NAME=YuiBot-MD
BOT_PREFIX=.
OWNER_NUMBER=51987654321

# Otras configuraciones
NODE_ENV=production
```

### Archivo de Configuración

Edita `config/config.js`:

```javascript
module.exports = {
  prefix: '.',
  botName: 'YuiBot-MD',
  ownerNumber: '51987654321',
  autoRead: true,
  presence: 'available'
};
```

---

## 🐛 Solución de Problemas

### El QR no aparece
```bash
# Asegúrate de que tienes Node.js 18+
node -v

# Intenta borrar la carpeta de sesión
rm -rf sessions/
npm start
```

### Error: "No se puede conectar a WhatsApp"
- Verifica tu conexión a internet
- Asegúrate de que tu cuenta de WhatsApp no esté bloqueada
- Intenta escanear el QR nuevamente

### Módulo no encontrado
```bash
# Reinstala las dependencias
rm -rf node_modules package-lock.json
npm install
```

---

## 🤝 Contribuir

¡Las contribuciones son bienvenidas! Por favor:

1. **Fork** el repositorio
2. **Crea una rama** para tu feature (`git checkout -b feature/nueva-caracteristica`)
3. **Commit** tus cambios (`git commit -m 'Agregar nueva característica'`)
4. **Push** a la rama (`git push origin feature/nueva-caracteristica`)
5. **Abre un Pull Request**

### Directrices de Contribución
- Sigue el estilo de código existente
- Documenta tu código con comentarios claros
- Prueba tu código antes de enviar el PR
- Actualiza el README si es necesario

---

## 📝 Licencia

Este proyecto está bajo la licencia **MIT**. Ver archivo [LICENSE](LICENSE) para más detalles.

---

## 👤 Autor

**Amilcar Git**
- GitHub: [@AmilcarGit](https://github.com/AmilcarGit)
- Email: [Contacto]

---

## 🙏 Agradecimientos

- [Baileys](https://github.com/WhiskeySockets/Baileys) - Por la librería de WhatsApp
- Todos los contribuidores y usuarios que ayudan a mejorar el proyecto

---

## 📞 Soporte

¿Necesitas ayuda? 
- 📋 Abre un [Issue](https://github.com/AmilcarGit/YuiBot-MD/issues)
- 💬 Revisa las [Discussions](https://github.com/AmilcarGit/YuiBot-MD/discussions)
- ⭐ Si te gusta, dale una estrella al repositorio

---

<div align="center">

**Hecho con ❤️ por Amilcar Git**

⬆ [Volver arriba](#-yuibot-md)

</div>
