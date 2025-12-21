const fastify = require('fastify')({ logger: true })
const cors = require('@fastify/cors')
const multipart = require('@fastify/multipart')
const sqlite3 = require('sqlite3').verbose()
const path = require('path')
const fs = require('fs')
const { v4: uuidv4 } = require('uuid')
const util = require('util')
const pipeline = util.promisify(require('stream').pipeline)

// Подключаем переменные окружения
const BOT_TOKEN = process.env.BOT_TOKEN
const GEMINI_KEY = process.env.GEMINI_KEY

// Определяем путь к БД
const dbPath = process.env.DB_PATH || path.join(__dirname, '..', 'database.db')
console.log('📁 Используется путь к БД:', dbPath)

// Определяем папку для загрузок
const uploadsDir = path.join(__dirname, 'public', 'uploads')
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true })
}

// CORS должен быть первым
fastify.register(cors, { origin: true })

// Регистрируем multipart для загрузки файлов
fastify.register(multipart)

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

// Функция для получения primary user ID
function getPrimaryUserId(userId) {
  return new Promise((resolve, reject) => {
    db.get("SELECT primary_user_id FROM user_links WHERE telegram_id = ?", [userId], (err, row) => {
      if (err) reject(err);
      else resolve(row ? row.primary_user_id : userId);
    });
  });
}

// Создание таблиц
db.serialize(() => {
  // Таблица связей
  db.run(`
    CREATE TABLE IF NOT EXISTS user_links (
      telegram_id INTEGER PRIMARY KEY,
      primary_user_id INTEGER NOT NULL,
      linked_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `)
  
  // Транзакции
  db.run(`
    CREATE TABLE IF NOT EXISTS transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      amount REAL,
      category TEXT,
      date TEXT,
      user_id INTEGER,
      type TEXT DEFAULT 'expense',
      account_id INTEGER,
      notes TEXT,
      tags TEXT,
      photo_url TEXT
    )
  `)
  
  // Миграции
  const migrations = [
    "ALTER TABLE transactions ADD COLUMN type TEXT DEFAULT 'expense'",
    "ALTER TABLE transactions ADD COLUMN account_id INTEGER",
    "ALTER TABLE transactions ADD COLUMN notes TEXT",
    "ALTER TABLE transactions ADD COLUMN tags TEXT",
    "ALTER TABLE transactions ADD COLUMN photo_url TEXT"
  ];

  migrations.forEach(migration => {
    db.run(migration, (err) => {
       // Игнорируем ошибки "duplicate column name", это нормально
    });
  });

  // Остальные таблицы...
  db.run(`
    CREATE TABLE IF NOT EXISTS user_settings (
      user_id INTEGER PRIMARY KEY,
      budget_limit REAL DEFAULT 0
    )
  `)

  // ... (код миграции category_limits пропущен для краткости, он есть в оригинале) ...
  // Вставляем полный блок миграции category_limits, так как overwrite_file заменяет файл целиком.
  db.get("SELECT count(*) as count FROM pragma_table_info('category_limits') WHERE name='effective_date'", (err, row) => {
    const migrationNeeded = row && row.count === 0;
    db.get("SELECT name FROM sqlite_master WHERE type='table' AND name='category_limits'", (err, tableRow) => {
      const tableExists = !!tableRow;
      if (tableExists && migrationNeeded) {
        console.log('🔄 Migrating category_limits to support history...');
        db.serialize(() => {
          db.run("ALTER TABLE category_limits RENAME TO category_limits_old");
          db.run(`
            CREATE TABLE category_limits (
              user_id INTEGER,
              category_id TEXT,
              limit_amount REAL,
              effective_date TEXT,
              PRIMARY KEY (user_id, category_id, effective_date)
            )
          `);
          db.run(`
            INSERT INTO category_limits (user_id, category_id, limit_amount, effective_date)
            SELECT user_id, category_id, limit_amount, '2000-01-01' FROM category_limits_old
          `);
          db.run("DROP TABLE category_limits_old");
          console.log('✅ category_limits migration complete.');
        });
      } else {
        db.run(`
          CREATE TABLE IF NOT EXISTS category_limits (
            user_id INTEGER,
            category_id TEXT,
            limit_amount REAL,
            effective_date TEXT,
            PRIMARY KEY (user_id, category_id, effective_date)
          )
        `);
      }
    });
  });

  db.run(`
    CREATE TABLE IF NOT EXISTS global_budget_limits (
      user_id INTEGER,
      limit_amount REAL,
      effective_date TEXT,
      PRIMARY KEY (user_id, effective_date)
    )
  `, () => {
    db.run(`
      INSERT OR IGNORE INTO global_budget_limits (user_id, limit_amount, effective_date)
      SELECT user_id, budget_limit, '2000-01-01' FROM user_settings WHERE budget_limit > 0
    `);
  })

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

  db.run(`
    CREATE TABLE IF NOT EXISTS accounts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      name TEXT NOT NULL,
      balance REAL DEFAULT 0,
      currency TEXT DEFAULT 'RUB',
      type TEXT DEFAULT 'cash',
      color TEXT,
      created_at TEXT,
      updated_at TEXT,
      UNIQUE(user_id, name)
    )
  `)

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

  db.run(`
    CREATE TABLE IF NOT EXISTS transfers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      from_type TEXT,
      from_id INTEGER,
      to_type TEXT,
      to_id INTEGER,
      amount REAL,
      date TEXT,
      description TEXT
    )
  `)

  db.run(`
    CREATE TABLE IF NOT EXISTS user_budget_settings (
      user_id INTEGER PRIMARY KEY,
      budget_mode TEXT DEFAULT 'monthly',
      custom_period_day INTEGER DEFAULT 1
    )
  `)
})

// --- MIDDLEWARE ---
fastify.addHook('preHandler', async (request, reply) => {
  const userId = request.headers['x-user-id'];
  if (userId && userId !== 'undefined') {
    try {
      const primaryUserId = await getPrimaryUserId(parseInt(userId));
      request.headers['x-primary-user-id'] = primaryUserId.toString();
    } catch (e) {
      console.error('Error getting primary user ID:', e);
      request.headers['x-primary-user-id'] = userId;
    }
  }
});

// --- API ---

fastify.post('/log-client', (request, reply) => {
  const { message, data } = request.body
  console.log('🔵 CLIENT LOG:', message, data)
  return reply.send({ status: 'logged' })
})

// Загрузка фото
fastify.post('/upload', async (request, reply) => {
  const data = await request.file()
  if (!data) return reply.code(400).send({ error: 'No file uploaded' })

  const ext = path.extname(data.filename)
  const filename = `${uuidv4()}${ext}`
  const filepath = path.join(uploadsDir, filename)

  await pipeline(data.file, fs.createWriteStream(filepath))

  const fileUrl = `/uploads/${filename}`
  return reply.send({ url: fileUrl })
})

// Добавить операцию
fastify.post('/add-expense', (request, reply) => {
  const { amount, category, type, account_id, target_type, date, notes, tags, photo_url } = request.body
  const userId = request.headers['x-primary-user-id']

  console.log('📥 /add-expense request:', { userId, amount, category, type, account_id, notes, tags, photo_url });

  if (!userId) return reply.code(400).send({ error: 'User ID is required' })

  const finalType = type || 'expense'
  const finalTargetType = target_type || 'account'
  const finalDate = date || new Date().toISOString()

  const query = `
    INSERT INTO transactions
    (amount, category, date, user_id, type, account_id, notes, tags, photo_url)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `
  
  db.run(query, [
    amount,
    category || 'general',
    finalDate,
    userId,
    finalType,
    account_id || null,
    notes || '',
    tags || '',
    photo_url || ''
  ], function(err) {
    if (err) {
      console.error('❌ Database error:', err);
      reply.code(500).send({ error: err.message })
    } else {
      console.log('✅ Transaction saved with ID:', this.lastID);
      
      if (account_id) {
        if (finalTargetType === 'goal') {
          if (finalType === 'expense') {
            db.run("UPDATE savings_goals SET current_amount = current_amount - ? WHERE id = ? AND user_id = ?", [amount, account_id, userId])
          } else if (finalType === 'income') {
            db.run("UPDATE savings_goals SET current_amount = current_amount + ? WHERE id = ? AND user_id = ?", [amount, account_id, userId])
          }
        } else {
          if (finalType === 'expense') {
            db.run("UPDATE accounts SET balance = balance - ? WHERE id = ? AND user_id = ?", [amount, account_id, userId])
          } else if (finalType === 'income') {
            db.run("UPDATE accounts SET balance = balance + ? WHERE id = ? AND user_id = ?", [amount, account_id, userId])
          }
        }
      }
      return reply.send({ id: this.lastID, status: 'saved', amount, type: finalType })
    }
  })
})

// Расчет бюджетного периода
function calculateBudgetPeriod(mode, periodDay, month, year) {
  if (mode === 'monthly') {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59);
    return { startDate, endDate };
  } else if (mode === 'custom') {
    const day = periodDay || 1;
    const startDate = new Date(year, month - 1, day);
    const endDate = new Date(year, month, day - 1, 23, 59, 59);
    return { startDate, endDate };
  }
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0, 23, 59, 59);
  return { startDate, endDate };
}

function getBudgetSettings(userId) {
  return new Promise((resolve, reject) => {
    db.get(
      "SELECT budget_mode, custom_period_day FROM user_budget_settings WHERE user_id = ?",
      [userId],
      (err, row) => {
        if (err) reject(err);
        else resolve(row || { budget_mode: 'monthly', custom_period_day: 1 });
      }
    );
  });
}

const getDateFilter = async (query, userId) => {
  const { month, year } = query;
  if (month !== undefined && year !== undefined) {
    const settings = await getBudgetSettings(userId);
    const { budget_mode, custom_period_day } = settings;
    const period = calculateBudgetPeriod(budget_mode, custom_period_day, parseInt(month), parseInt(year));
    const startStr = period.startDate.toISOString();
    const endStr = period.endDate.toISOString();
    return {
      sql: ` AND date >= ? AND date <= ? `,
      params: [startStr, endStr]
    };
  }
  return { sql: '', params: [] };
}

fastify.get('/balance', (request, reply) => {
  const userId = request.headers['x-primary-user-id']
  if (!userId) return reply.code(400).send({ error: 'User ID is required' })

  getDateFilter(request.query, userId)
    .then(filter => {
      const sql = `
        SELECT 
          SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END) as total_income,
          SUM(CASE WHEN type = 'expense' OR type IS NULL THEN amount ELSE 0 END) as total_expense
        FROM transactions 
        WHERE user_id = ? ${filter.sql}
      `
      db.get(sql, [userId, ...filter.params], (err, row) => {
        if (err) return reply.code(500).send({ error: err.message })
        const income = row.total_income || 0
        const expense = row.total_expense || 0
        return reply.send({ 
          balance: income - expense,
          total_expense: expense,
          total_income: income
        })
      })
    })
    .catch(err => reply.code(500).send({ error: err.message }))
})

fastify.get('/stats', (request, reply) => {
  const userId = request.headers['x-primary-user-id']
  if (!userId) return reply.code(400).send({ error: 'User ID is required' })

  getDateFilter(request.query, userId)
    .then(filter => {
      const sql = `
        SELECT category, SUM(amount) as value 
        FROM transactions 
        WHERE user_id = ? AND (type = 'expense' OR type IS NULL) ${filter.sql}
        GROUP BY category
      `
      db.all(sql, [userId, ...filter.params], (err, rows) => {
        if (err) return reply.code(500).send({ error: err.message })
        return reply.send(rows.map(r => ({ name: r.category, value: r.value })))
      })
    })
    .catch(err => reply.code(500).send({ error: err.message }))
})

fastify.get('/transactions', (request, reply) => {
  const userId = request.headers['x-primary-user-id']
  if (!userId) return reply.code(400).send({ error: 'User ID is required' })

  getDateFilter(request.query, userId)
    .then(filter => {
      const sql = `
        SELECT id, amount, category, date, type, notes, tags, photo_url
        FROM transactions 
        WHERE user_id = ? ${filter.sql}
        ORDER BY date DESC, id DESC 
        LIMIT 100 
      `
      db.all(sql, [userId, ...filter.params], (err, rows) => {
        if (err) return reply.code(500).send({ error: err.message })
        return reply.send(rows)
      })
    })
    .catch(err => reply.code(500).send({ error: err.message }))
})

fastify.delete('/transactions/:id', (request, reply) => {
  const userId = request.headers['x-primary-user-id']
  const { id } = request.params
  const sql = `DELETE FROM transactions WHERE id = ? AND user_id = ?`
  db.run(sql, [id, userId], function(err) {
    if (err) return reply.code(500).send({ error: err.message })
    else return reply.send({ status: 'deleted', id })
  })
})

fastify.put('/transactions/:id', (request, reply) => {
  const userId = request.headers['x-primary-user-id']
  const { id } = request.params
  const { amount, category, date, type, notes, tags, photo_url } = request.body
  
  const updates = []
  const params = []

  if (amount !== undefined) { updates.push('amount = ?'); params.push(amount); }
  if (category !== undefined) { updates.push('category = ?'); params.push(category); }
  if (date !== undefined) { updates.push('date = ?'); params.push(date); }
  if (type !== undefined) { updates.push('type = ?'); params.push(type); }
  if (notes !== undefined) { updates.push('notes = ?'); params.push(notes); }
  if (tags !== undefined) { updates.push('tags = ?'); params.push(tags); }
  if (photo_url !== undefined) { updates.push('photo_url = ?'); params.push(photo_url); }

  params.push(id)
  params.push(userId)

  const sql = `UPDATE transactions SET ${updates.join(', ')} WHERE id = ? AND user_id = ?`
  
  db.run(sql, params, function(err) {
    if (err) {
      return reply.code(500).send({ error: err.message })
    } else {
      return reply.send({ status: 'updated', id, changes: this.changes })
    }
  })
})

fastify.get('/settings', (request, reply) => {
  const userId = request.headers['x-primary-user-id']
  const { month, year } = request.query;
  const now = new Date();
  const m = month ? parseInt(month) : (now.getMonth() + 1);
  const y = year ? parseInt(year) : now.getFullYear();

  getBudgetSettings(userId).then(settings => {
    const period = calculateBudgetPeriod(settings.budget_mode, settings.custom_period_day, m, y);
    const targetDate = period.startDate.toISOString();

    const sql = `
      SELECT limit_amount
      FROM global_budget_limits
      WHERE user_id = ? AND effective_date <= ?
      ORDER BY effective_date DESC
      LIMIT 1
    `;
    db.get(sql, [userId, targetDate], (err, row) => {
      return reply.send({ budget: row ? row.limit_amount : 0 })
    })
  }).catch(err => reply.send({ budget: 0 }));
})

fastify.post('/settings', (request, reply) => {
  const userId = request.headers['x-primary-user-id']
  const { budget, month, year } = request.body
  const now = new Date();
  const m = month ? parseInt(month) : (now.getMonth() + 1);
  const y = year ? parseInt(year) : now.getFullYear();

  getBudgetSettings(userId).then(settings => {
    const period = calculateBudgetPeriod(settings.budget_mode, settings.custom_period_day, m, y);
    const effectiveDate = period.startDate.toISOString();

    db.run(
      "INSERT OR REPLACE INTO global_budget_limits (user_id, limit_amount, effective_date) VALUES (?, ?, ?)",
      [userId, budget, effectiveDate],
      () => reply.send({ status: 'ok' })
    )
  }).catch(err => reply.code(500).send({ error: err.message }));
})

fastify.get('/limits', (request, reply) => {
  const userId = request.headers['x-primary-user-id']
  getDateFilter(request.query, userId).then(filter => {
    const { month, year } = request.query;
    const now = new Date();
    const m = month ? parseInt(month) : (now.getMonth() + 1);
    const y = year ? parseInt(year) : now.getFullYear();
    
    getBudgetSettings(userId).then(settings => {
      const period = calculateBudgetPeriod(settings.budget_mode, settings.custom_period_day, m, y);
      const targetDate = period.startDate.toISOString();
      
      const sql = `
        SELECT category_id, limit_amount
        FROM category_limits t1
        WHERE user_id = ? 
          AND effective_date = (
            SELECT MAX(effective_date)
            FROM category_limits t2
            WHERE t2.user_id = t1.user_id 
              AND t2.category_id = t1.category_id
              AND t2.effective_date <= ?
          )
      `;
      db.all(sql, [userId, targetDate], (err, rows) => {
        const limits = {};
        if (rows) rows.forEach(r => limits[r.category_id] = r.limit_amount);
        return reply.send(limits)
      })
    });
  }).catch(err => reply.send({}));
})

fastify.get('/custom-categories', (request, reply) => {
  const userId = request.headers['x-primary-user-id']
  if (!userId) return reply.code(400).send({ error: 'User ID is required' })
  db.all("SELECT * FROM custom_categories WHERE user_id = ?", [userId], (err, rows) => {
    if (err) return reply.code(500).send({ error: err.message })
    return reply.send(rows || [])
  })
})

fastify.post('/custom-categories', (request, reply) => {
  const userId = request.headers['x-primary-user-id']
  if (!userId) return reply.code(400).send({ error: 'User ID is required' })
  const { name, icon, color, limit } = request.body
  if (!name) return reply.code(400).send({ error: 'Name is required' })
  
  const categoryId = `custom_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  const createdAt = new Date().toISOString()
  
  db.run(
    "INSERT INTO custom_categories (id, user_id, name, icon, color, created_at) VALUES (?, ?, ?, ?, ?, ?)",
    [categoryId, userId, name, icon || '📦', color || '#A0C4FF', createdAt],
    function(err) {
      if (err) return reply.code(500).send({ error: err.message })
      const limitValue = limit !== undefined && limit !== null ? limit : 0
      db.run(
        "INSERT INTO category_limits (user_id, category_id, limit_amount, effective_date) VALUES (?, ?, ?, ?)",
        [userId, categoryId, 0, '2000-01-01'],
        () => reply.send({ id: categoryId, name, icon: icon || '📦', color: color || '#A0C4FF', limit: limitValue })
      )
    }
  )
})

fastify.delete('/custom-categories/:id', (request, reply) => {
  const userId = request.headers['x-primary-user-id']
  const categoryId = request.params.id
  if (!userId) return reply.code(400).send({ error: 'User ID is required' })
  
  db.get("SELECT * FROM custom_categories WHERE id = ? AND user_id = ?", [categoryId, userId], (err, row) => {
    if (err) return reply.code(500).send({ error: err.message })
    if (!row) return reply.code(404).send({ error: 'Category not found' })
    
    db.run("DELETE FROM custom_categories WHERE id = ? AND user_id = ?", [categoryId, userId], (err) => {
      if (err) return reply.code(500).send({ error: err.message })
      db.run("DELETE FROM category_limits WHERE user_id = ? AND category_id = ?", [userId, categoryId], () => {
        return reply.send({ status: 'ok' })
      })
    })
  })
})

fastify.post('/limits', (request, reply) => {
  const userId = request.headers['x-primary-user-id']
  const { category, limit, month, year } = request.body
  const now = new Date();
  const m = month ? parseInt(month) : (now.getMonth() + 1);
  const y = year ? parseInt(year) : now.getFullYear();

  getBudgetSettings(userId).then(settings => {
    const period = calculateBudgetPeriod(settings.budget_mode, settings.custom_period_day, m, y);
    const effectiveDate = period.startDate.toISOString();
    db.run(
      "INSERT OR REPLACE INTO category_limits (user_id, category_id, limit_amount, effective_date) VALUES (?, ?, ?, ?)", 
      [userId, category, limit || 0, effectiveDate], 
      () => reply.send({ status: 'ok' })
    )
  }).catch(err => reply.code(500).send({ error: err.message }));
})

fastify.delete('/limits/:categoryId', (request, reply) => {
  const userId = request.headers['x-primary-user-id']
  const categoryId = request.params.categoryId
  db.run("DELETE FROM category_limits WHERE user_id = ? AND category_id = ?", [userId, categoryId], () => {
    return reply.send({ status: 'ok' })
  })
})

fastify.get('/accounts', (request, reply) => {
  const userId = request.headers['x-primary-user-id']
  if (!userId) return reply.code(400).send({ error: 'User ID is required' })
  db.all("SELECT * FROM accounts WHERE user_id = ? ORDER BY created_at ASC", [userId], (err, rows) => {
    if (err) return reply.code(500).send({ error: err.message })
    else return reply.send(rows || [])
  })
})

fastify.post('/accounts', (request, reply) => {
  const userId = request.headers['x-primary-user-id']
  const { name, balance, type, currency, color } = request.body
  if (!userId || !name) return reply.code(400).send({ error: 'Missing required fields' })
  const now = new Date().toISOString()
  db.run(
    "INSERT INTO accounts (user_id, name, balance, type, currency, color, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
    [userId, name, balance || 0, type || 'cash', currency || 'RUB', color || '#CAFFBF', now, now],
    function(err) {
      if (err) return reply.code(500).send({ error: err.message })
      else return reply.send({ id: this.lastID, status: 'created' })
    }
  )
})

fastify.put('/accounts/:id', (request, reply) => {
  const userId = request.headers['x-primary-user-id']
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
    if (err) return reply.code(500).send({ error: err.message })
    else return reply.send({ status: 'updated' })
  })
})

fastify.delete('/accounts/:id', (request, reply) => {
  const userId = request.headers['x-primary-user-id']
  const { id } = request.params
  if (!userId) return reply.code(400).send({ error: 'User ID is required' })
  db.run("DELETE FROM accounts WHERE id = ? AND user_id = ?", [id, userId], function(err) {
    if (err) return reply.code(500).send({ error: err.message })
    else return reply.send({ status: 'deleted' })
  })
})

fastify.get('/goals', (request, reply) => {
  const userId = request.headers['x-primary-user-id']
  if (!userId) return reply.code(400).send({ error: 'User ID is required' })
  db.all("SELECT * FROM savings_goals WHERE user_id = ? ORDER BY created_at ASC", [userId], (err, rows) => {
    if (err) return reply.code(500).send({ error: err.message })
    else return reply.send(rows || [])
  })
})

fastify.post('/goals', (request, reply) => {
  const userId = request.headers['x-primary-user-id']
  const { name, target_amount, category, icon, color, deadline } = request.body
  if (!userId || !name || !target_amount) return reply.code(400).send({ error: 'Missing required fields' })
  const now = new Date().toISOString()
  db.run(
    "INSERT INTO savings_goals (user_id, name, target_amount, current_amount, category, icon, color, deadline, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
    [userId, name, target_amount, 0, category || 'personal', icon || '🐷', color || '#FFFFFC', deadline || null, now, now],
    function(err) {
      if (err) return reply.code(500).send({ error: err.message })
      else return reply.send({ id: this.lastID, status: 'created' })
    }
  )
})

fastify.put('/goals/:id', (request, reply) => {
  const userId = request.headers['x-primary-user-id']
  const { id } = request.params
  const { name, target_amount, current_amount, color, deadline, icon } = request.body
  if (!userId) return reply.code(400).send({ error: 'User ID is required' })
  const now = new Date().toISOString()
  const updates = []
  const params = []
  if (name) { updates.push('name = ?'); params.push(name) }
  if (target_amount) { updates.push('target_amount = ?'); params.push(target_amount) }
  if (current_amount !== undefined) { updates.push('current_amount = ?'); params.push(current_amount) }
  if (color) { updates.push('color = ?'); params.push(color) }
  if (icon) { updates.push('icon = ?'); params.push(icon) }
  if (deadline !== undefined) { updates.push('deadline = ?'); params.push(deadline) }
  updates.push('updated_at = ?')
  params.push(now)
  params.push(id)
  params.push(userId)
  const sql = `UPDATE savings_goals SET ${updates.join(', ')} WHERE id = ? AND user_id = ?`
  db.run(sql, params, function(err) {
    if (err) return reply.code(500).send({ error: err.message })
    else return reply.send({ status: 'updated' })
  })
})

fastify.delete('/goals/:id', (request, reply) => {
  const userId = request.headers['x-primary-user-id']
  const { id } = request.params
  if (!userId) return reply.code(400).send({ error: 'User ID is required' })
  db.run("DELETE FROM savings_goals WHERE id = ? AND user_id = ?", [id, userId], function(err) {
    if (err) return reply.code(500).send({ error: err.message })
    else return reply.send({ status: 'deleted' })
  })
})

fastify.post('/transfer', (request, reply) => {
  const userId = request.headers['x-primary-user-id']
  const { from_type, from_id, to_type, to_id, amount, description } = request.body
  if (!userId || !from_type || !from_id || !to_type || !to_id || !amount) {
    return reply.code(400).send({ error: 'Missing required fields' })
  }
  const now = new Date().toISOString()
  db.serialize(() => {
    db.run("BEGIN TRANSACTION")
    if (from_type === 'account') {
      db.run("UPDATE accounts SET balance = balance - ? WHERE id = ? AND user_id = ?", [amount, from_id, userId])
    } else if (from_type === 'goal') {
      db.run("UPDATE savings_goals SET current_amount = current_amount - ? WHERE id = ? AND user_id = ?", [amount, from_id, userId])
    }
    if (to_type === 'account') {
      db.run("UPDATE accounts SET balance = balance + ? WHERE id = ? AND user_id = ?", [amount, to_id, userId])
    } else if (to_type === 'goal') {
      db.run("UPDATE savings_goals SET current_amount = current_amount + ? WHERE id = ? AND user_id = ?", [amount, to_id, userId])
    }
    db.run(
      "INSERT INTO transfers (user_id, from_type, from_id, to_type, to_id, amount, date, description) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
      [userId, from_type, from_id, to_type, to_id, amount, now, description || ''],
      function(err) {
        if (err) {
          db.run("ROLLBACK", () => reply.code(500).send({ error: err.message }))
        } else {
          db.run("COMMIT", () => reply.send({ id: this.lastID, status: 'transferred' }))
        }
      }
    )
  })
})

fastify.get('/total-balance', (request, reply) => {
  const userId = request.headers['x-primary-user-id']
  if (!userId) return reply.code(400).send({ error: 'User ID is required' })
  db.get("SELECT SUM(balance) as total FROM accounts WHERE user_id = ?", [userId], (err, row) => {
    if (err) return reply.code(500).send({ error: err.message })
    else return reply.send({ total: row && row.total ? row.total : 0 })
  })
})

fastify.get('/budget-period-settings', (request, reply) => {
  const userId = request.headers['x-primary-user-id']
  if (!userId) return reply.code(400).send({ error: 'User ID is required' })
  db.get(
    "SELECT budget_mode, custom_period_day FROM user_budget_settings WHERE user_id = ?",
    [userId],
    (err, row) => {
      if (err) return reply.code(500).send({ error: err.message })
      if (row) {
        const period_type = row.budget_mode === 'monthly' ? 'calendar_month' : 'custom_period'
        return reply.send({ 
          period_type: period_type, 
          period_start_day: row.custom_period_day 
        })
      }
      return reply.send({ period_type: 'calendar_month', period_start_day: 1 })
    }
  )
})

fastify.post('/budget-period-settings', (request, reply) => {
  const userId = request.headers['x-primary-user-id']
  const { period_type, period_start_day } = request.body
  if (!userId) return reply.code(400).send({ error: 'User ID is required' })
  if (!period_type || (period_type !== 'calendar_month' && period_type !== 'custom_period')) {
    return reply.code(400).send({ error: 'Invalid period_type' })
  }
  const day = period_start_day || 1
  if (day < 1 || day > 28) {
    return reply.code(400).send({ error: 'period_start_day must be between 1 and 28' })
  }
  const budget_mode = period_type === 'calendar_month' ? 'monthly' : 'custom'
  db.run(
    "INSERT OR REPLACE INTO user_budget_settings (user_id, budget_mode, custom_period_day) VALUES (?, ?, ?)",
    [userId, budget_mode, day],
    (err) => {
      if (err) return reply.code(500).send({ error: err.message })
      return reply.send({ status: 'ok', period_type, period_start_day: day })
    }
  )
})

fastify.post('/link-account', async (request, reply) => {
  const currentUserId = request.headers['x-user-id']
  const { primary_user_id } = request.body
  if (!currentUserId || !primary_user_id) return reply.code(400).send({ error: 'IDs required' })
  try {
    await new Promise((resolve, reject) => {
      db.run(
        "INSERT OR REPLACE INTO user_links (telegram_id, primary_user_id) VALUES (?, ?)",
        [currentUserId, primary_user_id],
        (err) => err ? reject(err) : resolve()
      )
    })
    console.log(`✅ Linked user ${currentUserId} to primary user ${primary_user_id}`)
    return reply.send({ status: 'linked', telegram_id: currentUserId, primary_user_id })
  } catch (err) {
    console.error('❌ Link account error:', err)
    return reply.code(500).send({ error: err.message })
  }
})

fastify.delete('/unlink-account', async (request, reply) => {
  const currentUserId = request.headers['x-user-id']
  if (!currentUserId) return reply.code(400).send({ error: 'User ID is required' })
  try {
    await new Promise((resolve, reject) => {
      db.run(
        "DELETE FROM user_links WHERE telegram_id = ?",
        [currentUserId],
        (err) => err ? reject(err) : resolve()
      )
    })
    console.log(`✅ Unlinked user ${currentUserId}`)
    return reply.send({ status: 'unlinked', telegram_id: currentUserId })
  } catch (err) {
    console.error('❌ Unlink account error:', err)
    return reply.code(500).send({ error: err.message })
  }
})

fastify.get('/linked-accounts', async (request, reply) => {
  const userId = request.headers['x-primary-user-id']
  if (!userId) return reply.code(400).send({ error: 'User ID is required' })
  try {
    const links = await new Promise((resolve, reject) => {
      db.all(
        "SELECT telegram_id, primary_user_id FROM user_links WHERE primary_user_id = ? OR telegram_id = ?",
        [userId, userId],
        (err, rows) => err ? reject(err) : resolve(rows || [])
      )
    })
    return reply.send({ primary_user_id: parseInt(userId), linked_accounts: links })
  } catch (err) {
    console.error('❌ Get linked accounts error:', err)
    return reply.code(500).send({ error: err.message })
  }
})

fastify.post('/reset-all-data', (request, reply) => {
  const userId = request.headers['x-user-id']
  if (!userId) return reply.code(400).send({ error: 'User ID required' })
  console.log(`🗑️ Resetting all data for user ${userId}`)
  const deletePromises = [
    new Promise((resolve, reject) => db.run('DELETE FROM transactions WHERE user_id = ?', [userId], (e) => e ? reject(e) : resolve())),
    new Promise((resolve, reject) => db.run('DELETE FROM accounts WHERE user_id = ?', [userId], (e) => e ? reject(e) : resolve())),
    new Promise((resolve, reject) => db.run('DELETE FROM savings_goals WHERE user_id = ?', [userId], (e) => e ? reject(e) : resolve())),
    new Promise((resolve, reject) => db.run('DELETE FROM user_settings WHERE user_id = ?', [userId], (e) => e ? reject(e) : resolve())),
    new Promise((resolve, reject) => db.run('DELETE FROM category_limits WHERE user_id = ?', [userId], (e) => e ? reject(e) : resolve())),
    new Promise((resolve, reject) => db.run('DELETE FROM custom_categories WHERE user_id = ?', [userId], (e) => e ? reject(e) : resolve())),
    new Promise((resolve, reject) => db.run('DELETE FROM user_links WHERE telegram_id = ? OR primary_user_id = ?', [userId, userId], (e) => e ? reject(e) : resolve())),
    new Promise((resolve, reject) => db.run('DELETE FROM transfers WHERE user_id = ?', [userId], (e) => e ? reject(e) : resolve()))
  ]
  Promise.all(deletePromises)
    .then(() => reply.send({ status: 'success', message: 'All data has been reset' }))
    .catch((err) => reply.code(500).send({ error: err.message }))
})

// Обслуживание статических файлов
fastify.setNotFoundHandler(async (req, res) => {
  const url = req.url.split('?')[0]
  const publicDir = path.join(__dirname, 'public')
  let filePath

  // Добавляем обработку uploads
  if (url.startsWith('/uploads/')) {
      filePath = path.join(publicDir, url);
  } else if (url === '/' || url === '') {
    filePath = path.join(publicDir, 'index.html')
  } else if (url.match(/\.(js|css|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|eot|html)$/)) {
    filePath = path.join(publicDir, url)
  } else {
    filePath = path.join(publicDir, 'index.html')
  }
  
  try {
    const fileContent = fs.readFileSync(filePath)
    const ext = path.extname(filePath).toLowerCase()
    const mimeTypes = {
      '.html': 'text/html',
      '.js': 'application/javascript',
      '.css': 'text/css',
      '.json': 'application/json',
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.gif': 'image/gif',
      '.svg': 'image/svg+xml',
      '.ico': 'image/x-icon',
      '.woff': 'font/woff',
      '.woff2': 'font/woff2',
      '.ttf': 'font/ttf',
      '.eot': 'application/vnd.ms-fontobject'
    }
    const contentType = mimeTypes[ext] || 'application/octet-stream'
    return res.type(contentType).send(fileContent)
  } catch (err) {
    return res.code(404).send('File not found')
  }
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