FROM node:18-bullseye-slim

# تثبيت عضلات المتصفح
RUN apt-get update && apt-get install -y \
    libnss3 libatk1.0-0 libatk-bridge2.0-0 libcups2 libdrm2 \
    libxkbcommon0 libxcomposite1 libxdamage1 libxext6 libxfixes3 \
    libxrandr2 libgbm1 libasound2 libpangocairo-1.0-0 libpango-1.0-0 \
    ca-certificates fonts-liberation lsb-release wget xdg-utils

WORKDIR /app
COPY package*.json ./
RUN npm install
RUN npx playwright install chromium
RUN npx playwright install-deps chromium

COPY . .
RUN npm run build

EXPOSE 3000
CMD ["npm", "start"]
