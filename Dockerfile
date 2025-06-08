# 1. Используем Node.js как базовый образ
FROM node:18

# 2. Устанавливаем рабочую директорию
WORKDIR /app

# 3. Копируем все файлы проекта (убедитесь, что .dockerignore не исключает нужные каталоги)
COPY . .

# 4. Устанавливаем зависимости проекта (включая запуск postinstall скриптов)
RUN npm install

# 5. Устанавливаем глобально Electron
RUN npm install -g electron

# 6. Указываем, что React будет работать на 3000 порту
EXPOSE 3000

# 7. Запускаем React и Electron
CMD ["sh", "-c", "npm start & sleep 5 && npm run electron"]
