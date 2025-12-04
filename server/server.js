const fastify = require('fastify')({ logger: true })
const cors = require('@fastify/cors')
const sqlite3 = require('sqlite3').verbose()
const path = require('path')
// Подключаем переменные окружения
const BOT_TOKEN = process.env.BOT_TOKEN
const GEMINI_KEY = process.env.GEMINI_KEY

// Раздача фронтенда
fastify.register(require('@fastify/static'), {
  root: path.join(__dirname, '../client/dist'),
})

fastify.register(cors, { origin: true })

// Подключаем бота
const { startBot } = require('./bot')

const db = new sqlite3.Database('./database.db', (err) => {
  if (err) console.error('Ошибка БД:', err.message)
  else {
    console.log('Подключено к SQLite')
    if (BOT_TOKEN && GEMINI_KEY) {
      startBot(BOT_TOKEN, db, GEMINI_KEY)
    }
  }
})

// Создание таблиц
db.serialize(() => {
  // Транзакции
  db.run(`
    CREATE TABLE IF NOT EXISTS transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      amount REAL,
      category TEXT,
      date TEXT,
      user_id INTEGER,
      type TEXT DEFAULT 'expense' -- // NEW: Тип транзакции (expense/income)
    )
  `)
  
  // Миграция для старых баз (добавляем колонку type, если её нет)
  db.run("ALTER TABLE transactions ADD COLUMN type TEXT DEFAULT 'expense'", () => {})

  // Настройки пользователя (Общий лимит)
  db.run(`
    CREATE TABLE IF NOT EXISTS user_settings (
      user_id INTEGER PRIMARY KEY,
      budget_limit REAL DEFAULT 0
    )
  `)

  // Лимиты категорий
  db.run(`
    CREATE TABLE IF NOT EXISTS category_limits (
      user_id INTEGER,
      category_id TEXT,
      limit_amount REAL,
      PRIMARY KEY (user_id, category_id)
    )
  `)
})

// --- API ---

// Добавить операцию (Расход или Доход)
fastify.post('/add-expense', (request, reply) => {
  // Теперь принимаем и TYPE
  const { amount, category, type } = request.body
  const userId = request.headers['x-user-id']

  if (!userId) return reply.code(400).send({ error: 'User ID is required' })

  // По умолчанию считаем расходом, если тип не передан
  const finalType = type || 'expense'

  const query = `INSERT INTO transactions (amount, category, date, user_id, type) VALUES (?, ?, ?, ?, ?)`
  const now = new Date().toISOString()
  
  db.run(query, [amount, category || 'general', now, userId, finalType], function(err) {
    if (err) reply.code(500).send({ error: err.message })
    else reply.send({ id: this.lastID, status: 'saved', amount, type: finalType })
  })
})

// Получить баланс (Доходы - Расходы)
fastify.get('/balance', (request, reply) => {
  const userId = request.headers['x-user-id']
  if (!userId) return reply.code(400).send({ error: 'User ID is required' })

  // SQL Магия: Если income, то прибавляем, иначе вычитаем (но мы храним суммы положительными)
  // Проще посчитать две суммы
  const sql = `
    SELECT 
      SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END) as total_income,
      SUM(CASE WHEN type = 'expense' OR type IS NULL THEN amount ELSE 0 END) as total_expense
    FROM transactions 
    WHERE user_id = ?
  `

  db.get(sql, [userId], (err, row) => {
    if (err) reply.code(500).send({ error: err.message })
    else {
      const income = row.total_income || 0
      const expense = row.total_expense || 0
      // Баланс = Заработал - Потратил
      // Но для Кота "Потрачено" (totalSpent) это именно расходы.
      // Давай вернем всё, чтобы фронтенд решал.
      reply.send({ 
        balance: income - expense, // Текущий остаток денег
        total_expense: expense,    // Всего потрачено (для прогресс бара)
        total_income: income       // Всего заработано
      })
    }
  })
})

// Статистика (ТОЛЬКО РАСХОДЫ для графика)
fastify.get('/stats', (request, reply) => {
  const userId = request.headers['x-user-id']
  if (!userId) return reply.code(400).send({ error: 'User ID is required' })

  const sql = `
    SELECT category, SUM(amount) as value 
    FROM transactions 
    WHERE user_id = ? AND (type = 'expense' OR type IS NULL)
    GROUP BY category
  `
  db.all(sql, [userId], (err, rows) => {
    if (err) reply.code(500).send({ error: err.message })
    else reply.send(rows.map(r => ({ name: r.category, value: r.value })))
  })
})

// История (Всё вместе, но возвращаем тип)
fastify.get('/transactions', (request, reply) => {
  const userId = request.headers['x-user-id']
  if (!userId) return reply.code(400).send({ error: 'User ID is required' })

  const sql = `
    SELECT id, amount, category, date, type
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

// Удаление
fastify.delete('/transactions/:id', (request, reply) => {
  const userId = request.headers['x-user-id']
  const { id } = request.params
  const sql = `DELETE FROM transactions WHERE id = ? AND user_id = ?`
  db.run(sql, [id, userId], function(err) {
    if (err) reply.code(500).send({ error: err.message })
    else reply.send({ status: 'deleted', id })
  })
})

// Настройки бюджета (Общий)
fastify.get('/settings', (request, reply) => {
  const userId = request.headers['x-user-id']
  db.get("SELECT budget_limit FROM user_settings WHERE user_id = ?", [userId], (err, row) => {
    reply.send({ budget: row ? row.budget_limit : 0 })
  })
})

fastify.post('/settings', (request, reply) => {
  const userId = request.headers['x-user-id']
  const { budget } = request.body
  db.run("REPLACE INTO user_settings (user_id, budget_limit) VALUES (?, ?)", [userId, budget], () => {
    reply.send({ status: 'ok' })
  })
})

// Лимиты категорий
fastify.get('/limits', (request, reply) => {
  const userId = request.headers['x-user-id']
  db.all("SELECT category_id, limit_amount FROM category_limits WHERE user_id = ?", [userId], (err, rows) => {
    const limits = {}; rows.forEach(r => limits[r.category_id] = r.limit_amount); reply.send(limits)
  })
})

fastify.post('/limits', (request, reply) => {
  const userId = request.headers['x-user-id']
  const { category, limit } = request.body
  db.run("REPLACE INTO category_limits (user_id, category_id, limit_amount) VALUES (?, ?, ?)", [userId, category, limit], () => {
    reply.send({ status: 'ok' })
  })
})

// Роутинг
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