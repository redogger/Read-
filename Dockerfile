# استخدام نسخة Node مستقرة
FROM node:18-bullseye-slim

# تثبيت المكتبات اللازمة لتشغيل المتصفح (Chromium) في بيئة Linux
RUN apt-get update && apt-get install -y \
    libnss3 libatk1.0-0 libatk-bridge2.0-0 libcups2 libdrm2 \
    libxkbcommon0 libxcomposite1 libxdamage1 libxext6 libxfixes3 \
    libxrandr2 libgbm1 libasound2 libpangocairo-1.0-0 libpango-1.0-0 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# نسخ ملفات التعريف وتثبيت المكتبات
COPY package*.json ./
RUN npm install

# تثبيت Chromium الخاص بـ Playwright
RUN npx playwright install chromium

# نسخ بقية ملفات المشروع
COPY . .

# بناء المشروع (Next.js Build)
RUN npm run build

# تحديد البورت اللي Hugging Face بيسمع ليه
EXPOSE 3000

# تشغيل السيرفر
CMD ["npm", "start"]
