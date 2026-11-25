FROM node:20-slim
# ffmpeg: necesario para crear stickers (.s y .saudio)
RUN apt-get update && apt-get install -y --no-install-recommends ffmpeg && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY package*.json ./
RUN npm install --omit=dev
COPY . .
CMD ["node", "yui.js"]
