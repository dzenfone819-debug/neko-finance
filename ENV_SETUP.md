# Инструкция по настройке переменных окружения на сервере

## На сервере выполните:

### Способ 1: Передать через командную строку (самый простой для Docker Compose)

```bash
cd ~/neko-finance

# Определите переменные в текущей сессии
export BOT_TOKEN="ваш_telegram_bot_token"
export GEMINI_KEY="ваш_gemini_api_key"

# Запустите docker compose
docker compose up --build -d
```

### Способ 2: Создать .env файл (рекомендуется для постоянного хранения)

```bash
cd ~/neko-finance

# Создайте .env файл
cat > .env << 'EOF'
BOT_TOKEN=ваш_telegram_bot_token
GEMINI_KEY=ваш_gemini_api_key
NODE_ENV=production
EOF

# Запустите docker compose
docker compose up --build -d
```

### Способ 3: Отредактировать вручную

```bash
cd ~/neko-finance

# Создайте файл
nano .env

# Добавьте туда:
# BOT_TOKEN=ваш_telegram_bot_token
# GEMINI_KEY=ваш_gemini_api_key
# NODE_ENV=production

# Сохраните (Ctrl+O, Enter, Ctrl+X)

docker compose up --build -d
```

## Где получить токены:

### BOT_TOKEN
1. Откройте Telegram
2. Найдите бота **@BotFather**
3. Пишите `/start` → `/newbot`
4. Следуйте инструкциям
5. Скопируйте полученный токен вида: `123456789:ABCDEfghijklmnopqrstuvwxyz_1234567890`

### GEMINI_KEY
1. Откройте https://ai.google.dev/
2. Нажмите **Get API Key**
3. Скопируйте сгенерированный ключ

## Проверить что всё работает:

```bash
# Посмотрите логи
docker compose logs -f neko-app

# Если видите ошибки про BOT_TOKEN или GEMINI_KEY - значит их нужно добавить в .env
```

## Если контейнер падает:

```bash
# Проверьте статус
docker compose ps

# Посмотрите логи полностью
docker compose logs neko-app

# Перезапустите
docker compose restart neko-app
```
