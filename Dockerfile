# 1. Берем за основу легкую версию Node.js (версия 20)
FROM node:20-alpine

# 2. Создаем папку внутри контейнера
WORKDIR /app

# 3. Копируем файлы настройки (package.json) для КЛИЕНТА и устанавливаем библиотеки
COPY client/package*.json ./client/
RUN cd client && npm install

# 4. Копируем исходный код КЛИЕНТА и собираем его (Build)
COPY client/ ./client/
RUN cd client && npm run build

# 5. Копируем файлы настройки для СЕРВЕРА и устанавливаем библиотеки
COPY server/package*.json ./server/
RUN cd server && npm install --production

# 6. Копируем код СЕРВЕРА
COPY server/ ./server/

# 7. Говорим, что приложение работает на порту 3000
EXPOSE 3000

# 8. Команда для запуска (Запускаем server.js)
CMD ["node", "server/server.js"]