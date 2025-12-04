const fastify = require('fastify')({ logger: true })
const cors = require('@fastify/cors')
const sqlite3 = require('sqlite3').verbose()
const path = require('path')
const { startBot } = require('./bot')
// Берем секреты из переменных окружения
const BOT_TOKEN = process.env.BOT_TOKEN
const GEMINI_KEY = process.env.GEMINI_KEY

// Проверка на всякий случай (чтобы не гадать, почему не работает)
if (!BOT_TOKEN || !GEMINI_KEY) {
  console.error('❌ ОШИБКА: Нет токенов! Проверь файл .env')
  process.exit(1)
}

// Раздача фронтенда
fastify.register(require('@fastify/static'), {
  root: path.join(__dirname, '../client/dist'),
})

fastify.register(cors, { origin: true })

const db = new sqlite3.Database('./database.db', (err) => {
  if (err) console.error('Ошибка БД:', err.message)
  else {
    console.log('Подключено к SQLite')
    // Передаем ТРИ аргумента: токен, базу и ключ ии
    startBot(BOT_TOKEN, db, GEMINI_KEY) // <-- NEW
  }
})

// Создание таблицы (с поддержкой user_id)
db.serialize(() => {
  // Мы создаем таблицу, если её нет
  db.run(`
    CREATE TABLE IF NOT EXISTS transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      amount REAL,
      category TEXT,
      date TEXT,
      user_id INTEGER  -- // NEW: Колонка для владельца
    )
  `)
  db.run(`
  CREATE TABLE IF NOT EXISTS user_settings (
    user_id INTEGER PRIMARY KEY,
    budget_limit REAL DEFAULT 0
  )
`)
  db.run(`
  CREATE TABLE IF NOT EXISTS category_limits (
    user_id INTEGER,
    category_id TEXT,
    limit_amount REAL,
    PRIMARY KEY (user_id, category_id)
  )
`)

  
  // // NEW: Хак для миграции (если таблица уже была старой)
  // Пытаемся добавить колонку, если её нет. Ошибку игнорируем (если колонка есть).
  db.run("ALTER TABLE transactions ADD COLUMN user_id INTEGER", () => {})
})

// --- API ---

// Добавить расход
fastify.post('/add-expense', (request, reply) => {
  // // NEW: Теперь ждем еще и category
  const { amount, category } = request.body
  const userId = request.headers['x-user-id']

  if (!userId) {
    return reply.code(400).send({ error: 'User ID is required' })
  }

  const query = `INSERT INTO transactions (amount, category, date, user_id) VALUES (?, ?, ?, ?)`
  const now = new Date().toISOString()
  
  // // NEW: Используем category || 'general' (если вдруг не прислали - будет general)
  db.run(query, [amount, category || 'general', now, userId], function(err) {
    if (err) reply.code(500).send({ error: err.message })
    else reply.send({ id: this.lastID, status: 'saved', amount: amount })
  })
})

// Получить баланс конкретного пользователя
fastify.get('/balance', (request, reply) => {
  // // NEW: Получаем ID из заголовков
  const userId = request.headers['x-user-id']

  if (!userId) {
    return reply.code(400).send({ error: 'User ID is required' })
  }

  // // NEW: Фильтруем данные: WHERE user_id = ?
  db.get("SELECT SUM(amount) as total FROM transactions WHERE user_id = ?", [userId], (err, row) => {
    if (err) reply.code(500).send({ error: err.message })
    else reply.send({ total: row.total || 0 })
  })
})
// --- Вставь это ПЕРЕД fastify.setNotFoundHandler ---

// Получить статистику по категориям
fastify.get('/stats', (request, reply) => {
  const userId = request.headers['x-user-id']
  if (!userId) return reply.code(400).send({ error: 'User ID is required' })

  // SQL Магия: Группируем траты по категориям и складываем суммы
  const sql = `
    SELECT category, SUM(amount) as value 
    FROM transactions 
    WHERE user_id = ? 
    GROUP BY category
  `
  
  db.all(sql, [userId], (err, rows) => {
    if (err) reply.code(500).send({ error: err.message })
    else {
      // Превращаем данные в формат для графика
      // Например: [{ name: 'general', value: 500 }, { name: 'taxi', value: 150 }]
      const data = rows.map(r => ({ name: r.category, value: r.value }))
      reply.send(data)
    }
  })
})

// Получить настройки (Лимит)
fastify.get('/settings', (request, reply) => {
  const userId = request.headers['x-user-id']
  if (!userId) return reply.code(400).send({ error: 'User ID is required' })

  db.get("SELECT budget_limit FROM user_settings WHERE user_id = ?", [userId], (err, row) => {
    if (err) reply.code(500).send({ error: err.message })
    else reply.send({ budget: row ? row.budget_limit : 0 })
  })
})

// Обновить лимит
fastify.post('/settings', (request, reply) => {
  const userId = request.headers['x-user-id']
  const { budget } = request.body
  
  if (!userId) return reply.code(400).send({ error: 'User ID is required' })

  // Используем REPLACE INTO - это как "Вставь или Обнови"
  db.run("REPLACE INTO user_settings (user_id, budget_limit) VALUES (?, ?)", [userId, budget], (err) => {
    if (err) reply.code(500).send({ error: err.message })
    else reply.send({ status: 'ok', budget })
  })
})

// Получить все лимиты категорий пользователя
fastify.get('/limits', (request, reply) => {
  const userId = request.headers['x-user-id']
  if (!userId) return reply.code(400).send({ error: 'User ID is required' })

  db.all("SELECT category_id, limit_amount FROM category_limits WHERE user_id = ?", [userId], (err, rows) => {
    if (err) reply.code(500).send({ error: err.message })
    else {
      // Превращаем массив в объект { food: 5000, taxi: 2000 }
      const limits = {}
      rows.forEach(r => limits[r.category_id] = r.limit_amount)
      reply.send(limits)
    }
  })
})

// Установить лимит для конкретной категории
fastify.post('/limits', (request, reply) => {
  const userId = request.headers['x-user-id']
  const { category, limit } = request.body

  if (!userId) return reply.code(400).send({ error: 'User ID is required' })

  db.run(
    "REPLACE INTO category_limits (user_id, category_id, limit_amount) VALUES (?, ?, ?)", 
    [userId, category, limit], 
    (err) => {
      if (err) reply.code(500).send({ error: err.message })
      else reply.send({ status: 'ok' })
    }
  )
})
// --- ИСТОРИЯ И УДАЛЕНИЕ ---

// 1. Получить последние 20 транзакций
fastify.get('/transactions', (request, reply) => {
  const userId = request.headers['x-user-id']
  if (!userId) return reply.code(400).send({ error: 'User ID is required' })

  const sql = `
    SELECT id, amount, category, date 
    FROM transactions 
    WHERE user_id = ? 
    ORDER BY id DESC 
    LIMIT 20
  `
  
  db.all(sql, [userId], (err, rows) => {
    if (err) reply.code(500).send({ error: err.message })
    else reply.send(rows)
  })
})

// 2. Удалить транзакцию (Обязательно проверяем user_id, чтобы не удалили чужое!)
fastify.delete('/transactions/:id', (request, reply) => {
  const userId = request.headers['x-user-id']
  const { id } = request.params

  if (!userId) return reply.code(400).send({ error: 'User ID is required' })

  const sql = `DELETE FROM transactions WHERE id = ? AND user_id = ?`
  
  db.run(sql, [id, userId], function(err) {
    if (err) reply.code(500).send({ error: err.message })
    else if (this.changes === 0) reply.code(404).send({ error: 'Record not found or access denied' })
    else reply.send({ status: 'deleted', id })
  })
})
// Обработка любых других путей (для React)
fastify.setNotFoundHandler((req, res) => {
  res.sendFile('index.html')
})

const start = async () => {
  try {
    await fastify.listen({ port: 3000, host: '0.0.0.0' })
    console.log('Сервер запущен')
  } catch (err) {
    fastify.log.error(err)
    process.exit(1)
  }
}

start()