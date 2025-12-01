const fastify = require('fastify')({ logger: true })
const cors = require('@fastify/cors')
const sqlite3 = require('sqlite3').verbose()
const path = require('path')

// 1. Статика (Наш Фронтенд)
// Мы говорим серверу: "Если просят сайт, отдай файлы из папки client/dist"
fastify.register(require('@fastify/static'), {
  root: path.join(__dirname, '../client/dist'),
})

fastify.register(cors, { origin: true })

// 2. База Данных
const db = new sqlite3.Database('./database.db', (err) => {
  if (err) console.error('Ошибка БД:', err.message)
  else console.log('Подключено к SQLite')
})

db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      amount REAL,
      category TEXT,
      date TEXT
    )
  `)
})

// 3. API Маршруты

// ВАЖНО: API теперь должны отличаться от обычных страниц, 
// но так как у нас SPA, можно оставить как есть, главное не перекрывать имена файлов.

fastify.post('/add-expense', (request, reply) => {
  const { amount } = request.body
  const query = `INSERT INTO transactions (amount, category, date) VALUES (?, ?, ?)`
  const now = new Date().toISOString()
  
  db.run(query, [amount, 'general', now], function(err) {
    if (err) reply.code(500).send({ error: err.message })
    else reply.send({ id: this.lastID, status: 'saved', amount: amount })
  })
})

fastify.get('/balance', (request, reply) => {
  db.get("SELECT SUM(amount) as total FROM transactions", [], (err, row) => {
    if (err) reply.code(500).send({ error: err.message })
    else reply.send({ total: row.total || 0 })
  })
})

// Если ввели неизвестный адрес — отдаем главную страницу (для React Router в будущем)
fastify.setNotFoundHandler((req, res) => {
  res.sendFile('index.html')
})

const start = async () => {
  try {
    await fastify.listen({ port: 3000, host: '0.0.0.0' }) // 0.0.0.0 важно для доступа извне
    console.log('Сервер Neko Finance запущен на порту 3000')
  } catch (err) {
    fastify.log.error(err)
    process.exit(1)
  }
}

start()