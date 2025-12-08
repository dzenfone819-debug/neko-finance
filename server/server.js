const fastify = require('fastify')({ logger: true })
const cors = require('@fastify/cors')
const sqlite3 = require('sqlite3').verbose()
const path = require('path')
const fs = require('fs')

// Подключаем переменные окружения
const BOT_TOKEN = process.env.BOT_TOKEN
const GEMINI_KEY = process.env.GEMINI_KEY

// Определяем путь к БД - используем /data/database.db (в Docker контейнере)
// или database.db (локально)
const dbPath = process.env.DB_PATH || path.join(__dirname, '..', 'database.db')
console.log('📁 Используется путь к БД:', dbPath)

// Раздача фронтенда
fastify.register(require('@fastify/static'), {
  root: path.join(__dirname, '../client/dist'),
})

fastify.register(cors, { origin: true })

// Подключаем бота
const { startBot } = require('./bot')

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('❌ Ошибка БД:', err.message)
    console.error('📁 Путь к БД:', dbPath)
    console.error('📁 Текущая директория:', __dirname)
  } else {
    console.log('✅ Подключено к SQLite')
    console.log('📁 БД находится по пути:', dbPath)
    if (BOT_TOKEN && GEMINI_KEY) {
      startBot(BOT_TOKEN, db, GEMINI_KEY)
    } else {
      console.warn('⚠️  BOT_TOKEN или GEMINI_KEY не установлены')
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
      type TEXT DEFAULT 'expense', -- Тип транзакции (expense/income)
      account_id INTEGER -- Счет, на который относится транзакция
    )
  `)
  
  // Миграция для старых баз (добавляем колонки, если их нет)
  db.run("ALTER TABLE transactions ADD COLUMN type TEXT DEFAULT 'expense'", () => {})
  db.run("ALTER TABLE transactions ADD COLUMN account_id INTEGER", () => {})

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

  // Кастомные категории (пользовательские лимиты)
  db.run(`
    CREATE TABLE IF NOT EXISTS custom_categories (
      id TEXT PRIMARY KEY,
      user_id INTEGER,
      name TEXT NOT NULL,
      icon TEXT,
      color TEXT,
      created_at TEXT
    )
  `)

  // СЧЕТА (Accounts) - текущие счета, кредитные карты, кошельки и т.д.
  db.run(`
    CREATE TABLE IF NOT EXISTS accounts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      name TEXT NOT NULL,
      balance REAL DEFAULT 0,
      currency TEXT DEFAULT 'RUB',
      type TEXT DEFAULT 'cash', -- cash, card, wallet, savings
      color TEXT,
      created_at TEXT,
      updated_at TEXT,
      UNIQUE(user_id, name)
    )
  `)

  // ЦЕЛИ СБЕРЕЖЕНИЙ (Savings Goals) - копилки
  db.run(`
    CREATE TABLE IF NOT EXISTS savings_goals (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      name TEXT NOT NULL,
      target_amount REAL,
      current_amount REAL DEFAULT 0,
      category TEXT,
      icon TEXT,
      color TEXT,
      deadline TEXT,
      created_at TEXT,
      updated_at TEXT,
      UNIQUE(user_id, name)
    )
  `)

  // ПЕРЕВОДЫ МЕЖДУ СЧЕТАМИ И КОПИЛКАМИ (Transfers)
  db.run(`
    CREATE TABLE IF NOT EXISTS transfers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      from_type TEXT, -- 'account' или 'goal'
      from_id INTEGER,
      to_type TEXT,
      to_id INTEGER,
      amount REAL,
      date TEXT,
      description TEXT
    )
  `)
})

// --- API ---

// Логирование
fastify.post('/log-client', (request, reply) => {
  const { message, data } = request.body
  console.log('🔵 CLIENT LOG:', message, data)
  reply.send({ status: 'logged' })
})

// Добавить операцию (Расход или Доход)
fastify.post('/add-expense', (request, reply) => {
  // Теперь принимаем TYPE, ACCOUNT_ID, и TARGET_TYPE (account или goal)
  const { amount, category, type, account_id, target_type } = request.body
  const userId = request.headers['x-user-id']

  console.log('📥 /add-expense FULL request.body:', JSON.stringify(request.body, null, 2));
  console.log('📥 /add-expense request:', { userId, amount, category, type, account_id, target_type });

  if (!userId) return reply.code(400).send({ error: 'User ID is required' })

  // По умолчанию считаем расходом, если тип не передан
  const finalType = type || 'expense'
  const finalTargetType = target_type || 'account'

  const query = `INSERT INTO transactions (amount, category, date, user_id, type, account_id) VALUES (?, ?, ?, ?, ?, ?)`
  const now = new Date().toISOString()
  
  db.run(query, [amount, category || 'general', now, userId, finalType, account_id || null], function(err) {
    if (err) {
      console.error('❌ Database error:', err);
      reply.code(500).send({ error: err.message })
    } else {
      console.log('✅ Transaction saved with ID:', this.lastID);
      
      // Обновляем баланс в зависимости от типа (account или goal)
      if (account_id) {
        if (finalTargetType === 'goal') {
          // Обновляем текущую сумму в копилке
          // При расходе - вычитаем (ведь это копилка, тратим из неё)
          // При доходе - прибавляем (пополняем копилку)
          if (finalType === 'expense') {
            db.run("UPDATE savings_goals SET current_amount = current_amount - ? WHERE id = ? AND user_id = ?", [amount, account_id, userId], (err) => {
              if (err) console.error('❌ Goal balance update error:', err);
              else console.log('✅ Goal balance updated (expense: -' + amount + ')');
            })
          } else if (finalType === 'income') {
            db.run("UPDATE savings_goals SET current_amount = current_amount + ? WHERE id = ? AND user_id = ?", [amount, account_id, userId], (err) => {
              if (err) console.error('❌ Goal balance update error:', err);
              else console.log('✅ Goal balance updated (income: +' + amount + ')');
            })
          }
        } else {
          // Обновляем баланс счета
          // При расходе - вычитаем
          // При доходе - прибавляем
          if (finalType === 'expense') {
            db.run("UPDATE accounts SET balance = balance - ? WHERE id = ? AND user_id = ?", [amount, account_id, userId], (err) => {
              if (err) console.error('❌ Balance update error:', err);
              else console.log('✅ Account balance updated (expense: -' + amount + ')');
            })
          } else if (finalType === 'income') {
            db.run("UPDATE accounts SET balance = balance + ? WHERE id = ? AND user_id = ?", [amount, account_id, userId], (err) => {
              if (err) console.error('❌ Balance update error:', err);
              else console.log('✅ Account balance updated (income: +' + amount + ')');
            })
          }
        }
      }
      reply.send({ id: this.lastID, status: 'saved', amount, type: finalType, account_id, target_type: finalTargetType })
    }
  })
})

// --- ВСПОМОГАТЕЛЬНАЯ ФУНКЦИЯ ДЛЯ SQL ---
// Формирует условие WHERE для фильтрации по месяцу
const getDateFilter = (query) => {
  const { month, year } = query;
  if (month !== undefined && year !== undefined) {
    // В JS месяцы 0-11, но мы будем слать 1-12. 
    // SQLite хранит даты как "YYYY-MM-DD..."
    // Нам нужно привести 3 к "03"
    const m = month.toString().padStart(2, '0');
    const y = year.toString();
    // Фильтр: дата начинается с "2024-03"
    return {
      sql: ` AND strftime('%Y-%m', date) = ? `,
      params: [`${y}-${m}`]
    };
  }
  return { sql: '', params: [] };
}

// 1. БАЛАНС (С учетом месяца)
fastify.get('/balance', (request, reply) => {
  const userId = request.headers['x-user-id']
  if (!userId) return reply.code(400).send({ error: 'User ID is required' })

  const filter = getDateFilter(request.query);

  const sql = `
    SELECT 
      SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END) as total_income,
      SUM(CASE WHEN type = 'expense' OR type IS NULL THEN amount ELSE 0 END) as total_expense
    FROM transactions 
    WHERE user_id = ? ${filter.sql}
  `

  db.get(sql, [userId, ...filter.params], (err, row) => {
    if (err) reply.code(500).send({ error: err.message })
    else {
      const income = row.total_income || 0
      const expense = row.total_expense || 0
      reply.send({ 
        balance: income - expense, // Остаток за ЭТОТ месяц
        total_expense: expense,
        total_income: income
      })
    }
  })
})

// 2. СТАТИСТИКА (С учетом месяца)
fastify.get('/stats', (request, reply) => {
  const userId = request.headers['x-user-id']
  if (!userId) return reply.code(400).send({ error: 'User ID is required' })

  const filter = getDateFilter(request.query);

  const sql = `
    SELECT category, SUM(amount) as value 
    FROM transactions 
    WHERE user_id = ? AND (type = 'expense' OR type IS NULL) ${filter.sql}
    GROUP BY category
  `
  db.all(sql, [userId, ...filter.params], (err, rows) => {
    if (err) reply.code(500).send({ error: err.message })
    else reply.send(rows.map(r => ({ name: r.category, value: r.value })))
  })
})

// 3. ИСТОРИЯ (С учетом месяца)
fastify.get('/transactions', (request, reply) => {
  const userId = request.headers['x-user-id']
  if (!userId) return reply.code(400).send({ error: 'User ID is required' })

  const filter = getDateFilter(request.query);

  const sql = `
    SELECT id, amount, category, date, type
    FROM transactions 
    WHERE user_id = ? ${filter.sql}
    ORDER BY date DESC, id DESC 
    LIMIT 100 
  `
  // Увеличили лимит до 100, так как мы теперь смотрим конкретный месяц
  
  db.all(sql, [userId, ...filter.params], (err, rows) => {
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

// Получить все кастомные категории пользователя
fastify.get('/custom-categories', (request, reply) => {
  const userId = request.headers['x-user-id']
  if (!userId) return reply.code(400).send({ error: 'User ID is required' })
  
  db.all("SELECT * FROM custom_categories WHERE user_id = ?", [userId], (err, rows) => {
    if (err) return reply.code(500).send({ error: err.message })
    reply.send(rows || [])
  })
})

// Создать новую кастомную категорию
fastify.post('/custom-categories', (request, reply) => {
  const userId = request.headers['x-user-id']
  if (!userId) return reply.code(400).send({ error: 'User ID is required' })
  
  const { name, icon, color, limit } = request.body
  if (!name) return reply.code(400).send({ error: 'Name is required' })
  
  // Генерируем уникальный ID для категории
  const categoryId = `custom_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  const createdAt = new Date().toISOString()
  
  db.run(
    "INSERT INTO custom_categories (id, user_id, name, icon, color, created_at) VALUES (?, ?, ?, ?, ?, ?)",
    [categoryId, userId, name, icon || '📦', color || '#A0C4FF', createdAt],
    function(err) {
      if (err) return reply.code(500).send({ error: err.message })
      
      // Если указан лимит, создаем запись в category_limits
      if (limit && limit > 0) {
        db.run(
          "INSERT INTO category_limits (user_id, category_id, limit_amount) VALUES (?, ?, ?)",
          [userId, categoryId, limit],
          () => {
            reply.send({ id: categoryId, name, icon: icon || '📦', color: color || '#A0C4FF', limit })
          }
        )
      } else {
        reply.send({ id: categoryId, name, icon: icon || '📦', color: color || '#A0C4FF' })
      }
    }
  )
})

// Удалить кастомную категорию
fastify.delete('/custom-categories/:id', (request, reply) => {
  const userId = request.headers['x-user-id']
  const categoryId = request.params.id
  
  if (!userId) return reply.code(400).send({ error: 'User ID is required' })
  
  // Проверяем, что категория принадлежит пользователю
  db.get("SELECT * FROM custom_categories WHERE id = ? AND user_id = ?", [categoryId, userId], (err, row) => {
    if (err) return reply.code(500).send({ error: err.message })
    if (!row) return reply.code(404).send({ error: 'Category not found' })
    
    // Удаляем категорию и её лимит
    db.run("DELETE FROM custom_categories WHERE id = ? AND user_id = ?", [categoryId, userId], (err) => {
      if (err) return reply.code(500).send({ error: err.message })
      
      db.run("DELETE FROM category_limits WHERE user_id = ? AND category_id = ?", [userId, categoryId], () => {
        reply.send({ status: 'ok' })
      })
    })
  })
})

fastify.post('/limits', (request, reply) => {
  const userId = request.headers['x-user-id']
  const { category, limit } = request.body
  
  if (limit === 0 || limit === null) {
    // Если лимит 0 или null, удаляем запись
    db.run("DELETE FROM category_limits WHERE user_id = ? AND category_id = ?", [userId, category], () => {
      reply.send({ status: 'ok' })
    })
  } else {
    db.run("REPLACE INTO category_limits (user_id, category_id, limit_amount) VALUES (?, ?, ?)", [userId, category, limit], () => {
      reply.send({ status: 'ok' })
    })
  }
})

// ========== API СЧЕТА И КОПИЛКИ ==========

// СЧЕТА - Получить все счета пользователя
fastify.get('/accounts', (request, reply) => {
  const userId = request.headers['x-user-id']
  if (!userId) return reply.code(400).send({ error: 'User ID is required' })
  
  db.all("SELECT * FROM accounts WHERE user_id = ? ORDER BY created_at ASC", [userId], (err, rows) => {
    if (err) reply.code(500).send({ error: err.message })
    else reply.send(rows || [])
  })
})

// СЧЕТА - Создать новый счет
fastify.post('/accounts', (request, reply) => {
  const userId = request.headers['x-user-id']
  const { name, balance, type, currency, color } = request.body
  
  if (!userId || !name) return reply.code(400).send({ error: 'Missing required fields' })
  
  const now = new Date().toISOString()
  db.run(
    "INSERT INTO accounts (user_id, name, balance, type, currency, color, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
    [userId, name, balance || 0, type || 'cash', currency || 'RUB', color || '#CAFFBF', now, now],
    function(err) {
      if (err) reply.code(500).send({ error: err.message })
      else reply.send({ id: this.lastID, status: 'created' })
    }
  )
})

// СЧЕТА - Обновить счет (баланс, имя и т.д.)
fastify.put('/accounts/:id', (request, reply) => {
  const userId = request.headers['x-user-id']
  const { id } = request.params
  const { name, balance, type, color } = request.body
  
  if (!userId) return reply.code(400).send({ error: 'User ID is required' })
  
  const now = new Date().toISOString()
  const updates = []
  const params = []
  
  if (name) { updates.push('name = ?'); params.push(name) }
  if (balance !== undefined) { updates.push('balance = ?'); params.push(balance) }
  if (type) { updates.push('type = ?'); params.push(type) }
  if (color) { updates.push('color = ?'); params.push(color) }
  
  updates.push('updated_at = ?')
  params.push(now)
  params.push(id)
  params.push(userId)
  
  const sql = `UPDATE accounts SET ${updates.join(', ')} WHERE id = ? AND user_id = ?`
  
  db.run(sql, params, function(err) {
    if (err) reply.code(500).send({ error: err.message })
    else reply.send({ status: 'updated' })
  })
})

// СЧЕТА - Удалить счет
fastify.delete('/accounts/:id', (request, reply) => {
  const userId = request.headers['x-user-id']
  const { id } = request.params
  
  if (!userId) return reply.code(400).send({ error: 'User ID is required' })
  
  db.run("DELETE FROM accounts WHERE id = ? AND user_id = ?", [id, userId], function(err) {
    if (err) reply.code(500).send({ error: err.message })
    else reply.send({ status: 'deleted' })
  })
})

// КОПИЛКИ - Получить все копилки пользователя
fastify.get('/goals', (request, reply) => {
  const userId = request.headers['x-user-id']
  if (!userId) return reply.code(400).send({ error: 'User ID is required' })
  
  db.all("SELECT * FROM savings_goals WHERE user_id = ? ORDER BY created_at ASC", [userId], (err, rows) => {
    if (err) reply.code(500).send({ error: err.message })
    else reply.send(rows || [])
  })
})

// КОПИЛКИ - Создать новую копилку
fastify.post('/goals', (request, reply) => {
  const userId = request.headers['x-user-id']
  const { name, target_amount, category, icon, color, deadline } = request.body
  
  if (!userId || !name || !target_amount) return reply.code(400).send({ error: 'Missing required fields' })
  
  const now = new Date().toISOString()
  db.run(
    "INSERT INTO savings_goals (user_id, name, target_amount, current_amount, category, icon, color, deadline, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
    [userId, name, target_amount, 0, category || 'personal', icon || '🐷', color || '#FFFFFC', deadline || null, now, now],
    function(err) {
      if (err) reply.code(500).send({ error: err.message })
      else reply.send({ id: this.lastID, status: 'created' })
    }
  )
})

// КОПИЛКИ - Обновить копилку
fastify.put('/goals/:id', (request, reply) => {
  const userId = request.headers['x-user-id']
  const { id } = request.params
  const { name, target_amount, current_amount, color, deadline } = request.body
  
  if (!userId) return reply.code(400).send({ error: 'User ID is required' })
  
  const now = new Date().toISOString()
  const updates = []
  const params = []
  
  if (name) { updates.push('name = ?'); params.push(name) }
  if (target_amount) { updates.push('target_amount = ?'); params.push(target_amount) }
  if (current_amount !== undefined) { updates.push('current_amount = ?'); params.push(current_amount) }
  if (color) { updates.push('color = ?'); params.push(color) }
  if (deadline !== undefined) { updates.push('deadline = ?'); params.push(deadline) }
  
  updates.push('updated_at = ?')
  params.push(now)
  params.push(id)
  params.push(userId)
  
  const sql = `UPDATE savings_goals SET ${updates.join(', ')} WHERE id = ? AND user_id = ?`
  
  db.run(sql, params, function(err) {
    if (err) reply.code(500).send({ error: err.message })
    else reply.send({ status: 'updated' })
  })
})

// КОПИЛКИ - Удалить копилку
fastify.delete('/goals/:id', (request, reply) => {
  const userId = request.headers['x-user-id']
  const { id } = request.params
  
  if (!userId) return reply.code(400).send({ error: 'User ID is required' })
  
  db.run("DELETE FROM savings_goals WHERE id = ? AND user_id = ?", [id, userId], function(err) {
    if (err) reply.code(500).send({ error: err.message })
    else reply.send({ status: 'deleted' })
  })
})

// ПЕРЕВОДЫ - Перевод между счетами или в копилку
fastify.post('/transfer', (request, reply) => {
  const userId = request.headers['x-user-id']
  const { from_type, from_id, to_type, to_id, amount, description } = request.body
  
  if (!userId || !from_type || !from_id || !to_type || !to_id || !amount) {
    return reply.code(400).send({ error: 'Missing required fields' })
  }
  
  const now = new Date().toISOString()
  
  // Начинаем транзакцию
  db.serialize(() => {
    db.run("BEGIN TRANSACTION")
    
    // Уменьшаем баланс источника
    if (from_type === 'account') {
      db.run("UPDATE accounts SET balance = balance - ? WHERE id = ? AND user_id = ?", [amount, from_id, userId])
    } else if (from_type === 'goal') {
      db.run("UPDATE savings_goals SET current_amount = current_amount - ? WHERE id = ? AND user_id = ?", [amount, from_id, userId])
    }
    
    // Увеличиваем баланс приемника
    if (to_type === 'account') {
      db.run("UPDATE accounts SET balance = balance + ? WHERE id = ? AND user_id = ?", [amount, to_id, userId])
    } else if (to_type === 'goal') {
      db.run("UPDATE savings_goals SET current_amount = current_amount + ? WHERE id = ? AND user_id = ?", [amount, to_id, userId])
    }
    
    // Записываем перевод
    db.run(
      "INSERT INTO transfers (user_id, from_type, from_id, to_type, to_id, amount, date, description) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
      [userId, from_type, from_id, to_type, to_id, amount, now, description || ''],
      function(err) {
        if (err) {
          db.run("ROLLBACK", () => {
            reply.code(500).send({ error: err.message })
          })
        } else {
          db.run("COMMIT", () => {
            reply.send({ id: this.lastID, status: 'transferred' })
          })
        }
      }
    )
  })
})

// БАЛАНС - Получить общий баланс со счетов
fastify.get('/total-balance', (request, reply) => {
  const userId = request.headers['x-user-id']
  if (!userId) return reply.code(400).send({ error: 'User ID is required' })
  
  db.get("SELECT SUM(balance) as total FROM accounts WHERE user_id = ?", [userId], (err, row) => {
    if (err) reply.code(500).send({ error: err.message })
    else reply.send({ total: row && row.total ? row.total : 0 })
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