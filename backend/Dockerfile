FROM node:20-bookworm

WORKDIR /app

RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    ffmpeg \
    && rm -rf /var/lib/apt/lists/*

COPY backend/package*.json ./backend/
WORKDIR /app/backend
RUN npm install

COPY python /app/python
RUN pip3 install --break-system-packages -r /app/python/requirements.txt

COPY backend /app/backend

RUN npm run build

ENV NODE_ENV=production

CMD ["npm", "start"]