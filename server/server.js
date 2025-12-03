const fastify = require('fastify')({ logger: true })
const cors = require('@fastify/cors')
const sqlite3 = require('sqlite3').verbose()
const path = require('path')

// Раздача фронтенда
fastify.register(require('@fastify/static'), {
  root: path.join(__dirname, '../client/dist'),
})

fastify.register(cors, { origin: true })

const db = new sqlite3.Database('./database.db', (err) => {
  if (err) console.error('Ошибка БД:', err.message)
  else console.log('Подключено к SQLite')
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
  
  // // NEW: Хак для миграции (если таблица уже была старой)
  // Пытаемся добавить колонку, если её нет. Ошибку игнорируем (если колонка есть).
  db.run("ALTER TABLE transactions ADD COLUMN user_id INTEGER", () => {})
})

// --- API ---

// Добавить расход
fastify.post('/add-expense', (request, reply) => {
  const { amount } = request.body
  // // NEW: Получаем ID пользователя из заголовков запроса
  const userId = request.headers['x-user-id']

  if (!userId) {
    return reply.code(400).send({ error: 'User ID is required' })
  }

  const query = `INSERT INTO transactions (amount, category, date, user_id) VALUES (?, ?, ?, ?)`
  const now = new Date().toISOString()
  
  // // NEW: Записываем userId в базу
  db.run(query, [amount, 'general', now, userId], function(err) {
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