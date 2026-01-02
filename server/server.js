const fastify = require('fastify')({ logger: true })
const cors = require('@fastify/cors')
const multipart = require('@fastify/multipart')
const sqlite3 = require('sqlite3').verbose()
const path = require('path')
const fs = require('fs')
const util = require('util')
const { pipeline } = require('stream')
const pump = util.promisify(pipeline)

// Подключаем переменные окружения
const BOT_TOKEN = process.env.BOT_TOKEN
const GEMINI_KEY = process.env.GEMINI_KEY

// Определяем путь к БД
const dbPath = process.env.DB_PATH || path.join(__dirname, '..', 'database.db')
console.log('📁 Используется путь к БД:', dbPath)

// Путь для загрузки файлов
const UPLOADS_DIR = path.join(__dirname, 'public', 'uploads')
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true })
}

// Регистрация плагинов
fastify.register(cors, { origin: true })
fastify.register(multipart)

// Подключаем бота
const { startBot } = require('./bot')

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('❌ Ошибка БД:', err.message)
  } else {
    console.log('✅ Подключено к SQLite')
    if (BOT_TOKEN && GEMINI_KEY) {
      startBot(BOT_TOKEN, db, GEMINI_KEY)
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

// Создание таблиц и миграции
db.serialize(() => {
  // ... (предыдущие таблицы) ...
  db.run(`
    CREATE TABLE IF NOT EXISTS user_links (
      telegram_id INTEGER PRIMARY KEY,
      primary_user_id INTEGER NOT NULL,
      linked_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `)
  
  db.run(`
    CREATE TABLE IF NOT EXISTS transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      amount REAL,
      category TEXT,
      date TEXT,
      user_id INTEGER,
      type TEXT DEFAULT 'expense',
      account_id INTEGER,
      note TEXT,
      tags TEXT,
      photo_urls TEXT
    )
  `)
  
  // Миграции
  db.run("ALTER TABLE transactions ADD COLUMN type TEXT DEFAULT 'expense'", () => {})
  db.run("ALTER TABLE transactions ADD COLUMN account_id INTEGER", () => {})
  // Новые поля
  db.run("ALTER TABLE transactions ADD COLUMN note TEXT", () => {})
  db.run("ALTER TABLE transactions ADD COLUMN tags TEXT", () => {})
  db.run("ALTER TABLE transactions ADD COLUMN photo_urls TEXT", () => {})
  db.run("ALTER TABLE transactions ADD COLUMN target_type TEXT DEFAULT 'account'", () => {})

  // ... (остальные таблицы без изменений) ...
  db.run(`
    CREATE TABLE IF NOT EXISTS user_settings (
      user_id INTEGER PRIMARY KEY,
      budget_limit REAL DEFAULT 0
    )
  `)
  
  // Создаем таблицу category_limits, если её нет (упрощенно для контекста, полная логика в оригинале)
  db.run(`
    CREATE TABLE IF NOT EXISTS category_limits (
      user_id INTEGER,
      category_id TEXT,
      limit_amount REAL,
      effective_date TEXT,
      PRIMARY KEY (user_id, category_id, effective_date)
    )
  `)

  db.run(`
    CREATE TABLE IF NOT EXISTS global_budget_limits (
      user_id INTEGER,
      limit_amount REAL,
      effective_date TEXT,
      PRIMARY KEY (user_id, effective_date)
    )
  `)

  db.run(`
    CREATE TABLE IF NOT EXISTS custom_categories (
      id TEXT PRIMARY KEY,
      user_id INTEGER,
      name TEXT NOT NULL,
      icon TEXT,
      color TEXT,
      created_at TEXT,
      type TEXT DEFAULT 'expense',
      is_deleted INTEGER DEFAULT 0
    )
  `)
  
  db.run("ALTER TABLE custom_categories ADD COLUMN type TEXT DEFAULT 'expense'", () => {})
  db.run("ALTER TABLE custom_categories ADD COLUMN is_deleted INTEGER DEFAULT 0", () => {})

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

  db.run(`
    CREATE TABLE IF NOT EXISTS reminders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      title TEXT NOT NULL,
      frequency TEXT DEFAULT 'once',
      time TEXT NOT NULL,
      start_date TEXT,
      end_date TEXT,
      is_active INTEGER DEFAULT 1,
      last_sent TEXT,
      timezone_offset INTEGER DEFAULT 0,
      created_at TEXT
    )
  `)

  db.run(`
    CREATE TABLE IF NOT EXISTS category_overrides (
      user_id INTEGER,
      category_id TEXT,
      data TEXT,
      PRIMARY KEY (user_id, category_id)
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
      request.headers['x-primary-user-id'] = userId;
    }
  }
});

// --- API ---

// ЗАГРУЗКА ФАЙЛОВ
fastify.post('/upload', async (req, reply) => {
  const data = await req.file()
  if (!data) return reply.code(400).send({ error: 'No file uploaded' })
  
  const ext = path.extname(data.filename)
  const filename = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}${ext}`
  const filepath = path.join(UPLOADS_DIR, filename)
  
  await pump(data.file, fs.createWriteStream(filepath))
  
  // Возвращаем относительный путь
  return reply.send({ url: `/uploads/${filename}` })
})

// Добавить операцию (Расход или Доход)
fastify.post('/add-expense', (request, reply) => {
  const { amount, category, type, account_id, target_type, date, note, tags, photo_urls } = request.body
  const userId = request.headers['x-primary-user-id']

  if (!userId) return reply.code(400).send({ error: 'User ID is required' })

  const finalType = type || 'expense'
  const finalTargetType = target_type || 'account'
  const finalDate = date || new Date().toISOString()
  
  // tags и photo_urls ожидаем как массивы, сохраняем как JSON string
  const tagsStr = Array.isArray(tags) ? JSON.stringify(tags) : (tags || '[]')
  const photosStr = Array.isArray(photo_urls) ? JSON.stringify(photo_urls) : (photo_urls || '[]')

  // Добавляем target_type в INSERT
  const query = `INSERT INTO transactions (amount, category, date, user_id, type, account_id, target_type, note, tags, photo_urls) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  
  db.run(query, [amount, category || 'general', finalDate, userId, finalType, account_id || null, finalTargetType, note || '', tagsStr, photosStr], function(err) {
    if (err) {
      console.error('❌ Database error:', err);
      reply.code(500).send({ error: err.message })
    } else {
      // Обновляем баланс
      if (account_id) {
        const table = finalTargetType === 'goal' ? 'savings_goals' : 'accounts'
        const amountCol = finalTargetType === 'goal' ? 'current_amount' : 'balance'
        const operator = (finalType === 'expense') ? '-' : '+'
        
        db.run(`UPDATE ${table} SET ${amountCol} = ${amountCol} ${operator} ? WHERE id = ? AND user_id = ?`, [amount, account_id, userId])
      }
      return reply.send({ id: this.lastID, status: 'saved' })
    }
  })
})

// ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ (calculateBudgetPeriod, getBudgetSettings, getDateFilter)
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
        if (err) resolve({ budget_mode: 'monthly', custom_period_day: 1 });
        else resolve(row || { budget_mode: 'monthly', custom_period_day: 1 });
      }
    );
  });
}

const getDateFilter = async (query, userId) => {
  const { month, year, force_calendar_mode } = query;
  if (month !== undefined && year !== undefined) {
    // Если передан флаг force_calendar_mode, используем календарный месяц
    if (force_calendar_mode === 'true') {
      const period = calculateBudgetPeriod('monthly', 1, parseInt(month), parseInt(year));
      return {
        sql: ` AND date >= ? AND date <= ? `,
        params: [period.startDate.toISOString(), period.endDate.toISOString()]
      };
    }
    
    const settings = await getBudgetSettings(userId);
    const { budget_mode, custom_period_day } = settings;
    const period = calculateBudgetPeriod(budget_mode, custom_period_day, parseInt(month), parseInt(year));
    return {
      sql: ` AND date >= ? AND date <= ? `,
      params: [period.startDate.toISOString(), period.endDate.toISOString()]
    };
  }
  return { sql: '', params: [] };
}

// БАЛАНС
fastify.get('/balance', (request, reply) => {
  const userId = request.headers['x-primary-user-id']
  if (!userId) return reply.code(400).send({ error: 'User ID is required' })

  getDateFilter(request.query, userId).then(filter => {
    const sql = `
      SELECT 
        SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END) as total_income,
        SUM(CASE WHEN type = 'expense' OR type IS NULL THEN amount ELSE 0 END) as total_expense
      FROM transactions 
      WHERE user_id = ? ${filter.sql}
    `
    db.get(sql, [userId, ...filter.params], (err, row) => {
      if (err) return reply.code(500).send({ error: err.message })
      const income = row ? row.total_income || 0 : 0
      const expense = row ? row.total_expense || 0 : 0
      return reply.send({ balance: income - expense, total_expense: expense, total_income: income })
    })
  })
})

// СТАТИСТИКА
fastify.get('/stats', (request, reply) => {
  const userId = request.headers['x-primary-user-id']
  if (!userId) return reply.code(400).send({ error: 'User ID is required' })

  getDateFilter(request.query, userId).then(filter => {
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
})

// ИСТОРИЯ
fastify.get('/transactions', (request, reply) => {
  const userId = request.headers['x-primary-user-id']
  if (!userId) return reply.code(400).send({ error: 'User ID is required' })

  getDateFilter(request.query, userId).then(filter => {
    let { limit, offset } = request.query;
    
    // Default limit 30 if not specified
    // If limit is '0', 'all', or '-1', then no limit
    let limitSql = '';
    const params = [userId, ...filter.params, userId, ...filter.params];

    if (limit === '0' || limit === 'all' || limit === '-1') {
       limitSql = '';
    } else {
       const lim = limit ? parseInt(limit) : 30;
       const off = offset ? parseInt(offset) : 0;
       limitSql = `LIMIT ? OFFSET ?`;
       params.push(lim, off);
    }

    // Объединяем транзакции и переводы в один список
    const sql = `
      SELECT id, amount, category, date, type, account_id, note, tags, photo_urls, 
             NULL as from_type, NULL as from_id, NULL as to_type, NULL as to_id, 
             NULL as description, 'transaction' as record_type
      FROM transactions 
      WHERE user_id = ? ${filter.sql}
      
      UNION ALL
      
      SELECT id, amount, NULL as category, date, 'transfer' as type, NULL as account_id, 
             NULL as note, NULL as tags, NULL as photo_urls,
             from_type, from_id, to_type, to_id, description, 'transfer' as record_type
      FROM transfers
      WHERE user_id = ? ${filter.sql}
      
      ORDER BY date DESC, id DESC 
      ${limitSql}
    `
    db.all(sql, params, (err, rows) => {
      if (err) return reply.code(500).send({ error: err.message })
      return reply.send(rows)
    })
  })
})

// УДАЛЕНИЕ
fastify.delete('/transactions/:id', (request, reply) => {
  const userId = request.headers['x-primary-user-id']
  const { id } = request.params
  
  // 1. Fetch transaction details (to revert balance & delete files)
  db.get("SELECT * FROM transactions WHERE id = ? AND user_id = ?", [id, userId], (err, row) => {
    if (err) {
      console.error('DB error fetching transaction for deletion:', err);
      return reply.code(500).send({ error: err.message });
    }
    if (!row) {
        return reply.code(404).send({ error: 'Transaction not found' });
    }

    // 2. Revert Balance Logic
    const oldAmount = row.amount;
    const oldType = row.type || 'expense'; // 'expense' or 'income'
    const accountId = row.account_id;
    const targetType = row.target_type || 'account'; // 'account' or 'goal'

    if (accountId) {
        const table = targetType === 'goal' ? 'savings_goals' : 'accounts';
        const amountCol = targetType === 'goal' ? 'current_amount' : 'balance';
        
        // Revert logic:
        // If it was expense, we ADD back the amount.
        // If it was income, we SUBTRACT the amount.
        const operator = (oldType === 'expense') ? '+' : '-';
        
        db.run(`UPDATE ${table} SET ${amountCol} = ${amountCol} ${operator} ? WHERE id = ? AND user_id = ?`, [oldAmount, accountId, userId], (errUpd) => {
            if (errUpd) console.error('Failed to revert balance on delete', errUpd);
        });
    }

    // 3. Delete Files
    const photosJson = row.photo_urls ? row.photo_urls : '[]';
    let photoList = [];
    try {
      photoList = typeof photosJson === 'string' ? JSON.parse(photosJson) : photosJson;
    } catch (e) {
      photoList = [];
    }
    if (Array.isArray(photoList) && photoList.length > 0) {
      photoList.forEach(p => {
        try {
          const fname = path.basename(p);
          const fullPath = path.join(UPLOADS_DIR, fname);
          if (fs.existsSync(fullPath)) fs.unlinkSync(fullPath);
        } catch (e) { console.warn('Failed to delete upload', p, e); }
      });
    }

    // 4. Delete Record
    db.run("DELETE FROM transactions WHERE id = ? AND user_id = ?", [id, userId], function(err2) {
      if (err2) {
        console.error('DB error deleting transaction:', err2);
        return reply.code(500).send({ error: err2.message });
      }
      return reply.send({ status: 'deleted', id });
    });
  });
})

// ОБНОВЛЕНИЕ ТРАНЗАКЦИИ
fastify.put('/transactions/:id', (request, reply) => {
  const userId = request.headers['x-primary-user-id']
  const { id } = request.params
  const { amount, category, date, type, note, tags, photo_urls } = request.body
  
  const tagsStr = Array.isArray(tags) ? JSON.stringify(tags) : tags
  const photosStr = Array.isArray(photo_urls) ? JSON.stringify(photo_urls) : photo_urls

  // 1. Fetch OLD transaction details
  db.get("SELECT * FROM transactions WHERE id = ? AND user_id = ?", [id, userId], (err, oldRow) => {
      if (err) return reply.code(500).send({ error: err.message });
      if (!oldRow) return reply.code(404).send({ error: 'Transaction not found' });

      // 2. Prepare Update SQL
      // Note: We do NOT update account_id or target_type via this endpoint currently, per requirement to just change amount/date/category
      // But we DO need to update the balance on the referenced account.
      
      const sql = `UPDATE transactions SET amount = ?, category = ?, date = ?, type = ?, note = ?, tags = ?, photo_urls = ? WHERE id = ? AND user_id = ?`
      
      db.run(sql, [amount, category, date, type, note, tagsStr, photosStr, id, userId], function(err2) {
        if (err2) return reply.code(500).send({ error: err2.message })

        // 3. Update Balance Logic
        // We need to revert the old amount and apply the new amount.
        // We assume the account_id and target_type haven't changed.
        const accountId = oldRow.account_id;
        const targetType = oldRow.target_type || 'account';
        const table = targetType === 'goal' ? 'savings_goals' : 'accounts';
        const amountCol = targetType === 'goal' ? 'current_amount' : 'balance';

        if (accountId) {
             // Step A: Revert OLD amount
             // If old was expense, we ADD back. If income, SUBTRACT.
             const oldOp = (oldRow.type || 'expense') === 'expense' ? '+' : '-';
             
             // Step B: Apply NEW amount
             // If new is expense, we SUBTRACT. If income, ADD.
             const newOp = (type || 'expense') === 'expense' ? '-' : '+';

             // Optimization: We can do it in one query or two. Two is safer to read.
             // Revert old
             db.run(`UPDATE ${table} SET ${amountCol} = ${amountCol} ${oldOp} ? WHERE id = ? AND user_id = ?`, [oldRow.amount, accountId, userId], (errRev) => {
                 if (errRev) console.error('Failed to revert balance on update', errRev);
                 
                 // Apply new
                 db.run(`UPDATE ${table} SET ${amountCol} = ${amountCol} ${newOp} ? WHERE id = ? AND user_id = ?`, [amount, accountId, userId], (errApp) => {
                    if (errApp) console.error('Failed to apply balance on update', errApp);
                 });
             });
        }

        return reply.send({ status: 'updated' })
      })
  });
})

// ... Остальные эндпоинты (settings, limits, accounts, goals, reminders) остаются как есть ...
// Для экономии места и токенов я не буду переписывать весь файл, если он не меняется.
// Но в overwrite_file я должен предоставить ПОЛНЫЙ файл.
// Поэтому я скопирую все остальные функции.

// SETTINGS (Global Budget)
fastify.get('/settings', (request, reply) => {
  const userId = request.headers['x-primary-user-id']
  const { month, year } = request.query;
  const now = new Date();
  const m = month ? parseInt(month) : (now.getMonth() + 1);
  const y = year ? parseInt(year) : now.getFullYear();

  getBudgetSettings(userId).then(settings => {
    const period = calculateBudgetPeriod(settings.budget_mode, settings.custom_period_day, m, y);
    const targetDate = period.startDate.toISOString();
    const sql = `SELECT limit_amount FROM global_budget_limits WHERE user_id = ? AND effective_date <= ? ORDER BY effective_date DESC LIMIT 1`;
    db.get(sql, [userId, targetDate], (err, row) => reply.send({ budget: row ? row.limit_amount : 0 }))
  }).catch(() => reply.send({ budget: 0 }));
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
    db.run("INSERT OR REPLACE INTO global_budget_limits (user_id, limit_amount, effective_date) VALUES (?, ?, ?)", [userId, budget, effectiveDate], () => reply.send({ status: 'ok' }))
  })
})

// CATEGORY LIMITS
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
        SELECT category_id, limit_amount FROM category_limits t1
        WHERE user_id = ? AND effective_date = (
          SELECT MAX(effective_date) FROM category_limits t2
          WHERE t2.user_id = t1.user_id AND t2.category_id = t1.category_id AND t2.effective_date <= ?
        )
      `;
      db.all(sql, [userId, targetDate], (err, rows) => {
        const limits = {};
        if (rows) rows.forEach(r => limits[r.category_id] = r.limit_amount);
        return reply.send(limits)
      })
    })
  }).catch(() => reply.send({}))
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
    db.run("INSERT OR REPLACE INTO category_limits (user_id, category_id, limit_amount, effective_date) VALUES (?, ?, ?, ?)", [userId, category, limit || 0, effectiveDate], () => reply.send({ status: 'ok' }))
  })
})

fastify.delete('/limits/:categoryId', (request, reply) => {
  const userId = request.headers['x-primary-user-id']
  db.run("DELETE FROM category_limits WHERE user_id = ? AND category_id = ?", [userId, request.params.categoryId], () => reply.send({ status: 'ok' }))
})

// CUSTOM CATEGORIES
fastify.get('/custom-categories', (request, reply) => {
  const userId = request.headers['x-primary-user-id']
  const includeDeleted = request.query.includeDeleted === 'true'
  // По умолчанию возвращаем только не удаленные категории (is_deleted = 0 или NULL)
  // Если includeDeleted=true, возвращаем все категории (для истории транзакций)
  const query = includeDeleted 
    ? "SELECT * FROM custom_categories WHERE user_id = ?"
    : "SELECT * FROM custom_categories WHERE user_id = ? AND (is_deleted = 0 OR is_deleted IS NULL)"
  db.all(query, [userId], (err, rows) => reply.send(rows || []))
})

fastify.post('/custom-categories', (request, reply) => {
  const userId = request.headers['x-primary-user-id']
  const { name, icon, color, limit, type } = request.body
  const categoryId = `custom_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  const categoryType = type || 'expense';
  db.run("INSERT INTO custom_categories (id, user_id, name, icon, color, created_at, type) VALUES (?, ?, ?, ?, ?, ?, ?)", [categoryId, userId, name, icon || '📦', color || '#A0C4FF', new Date().toISOString(), categoryType], function(err) {
    if (err) return reply.code(500).send({ error: err.message })
    const limitValue = limit !== undefined && limit !== null ? limit : 0
    db.run("INSERT INTO category_limits (user_id, category_id, limit_amount, effective_date) VALUES (?, ?, ?, ?)", [userId, categoryId, 0, '2000-01-01'], () => reply.send({ id: categoryId, name, icon, color, limit: limitValue, type: categoryType }))
  })
})

fastify.put('/custom-categories/:id', (request, reply) => {
  const userId = request.headers['x-primary-user-id']
  const categoryId = request.params.id
  const { name, icon, color } = request.body
  // Обновляем категорию (используется перед удалением для сохранения актуальных значений)
  db.run("UPDATE custom_categories SET name = ?, icon = ?, color = ? WHERE id = ? AND user_id = ?", 
    [name, icon, color, categoryId, userId], 
    (err) => {
      if (err) return reply.code(500).send({ error: err.message })
      reply.send({ status: 'ok' })
    }
  )
})

fastify.delete('/custom-categories/:id', (request, reply) => {
  const userId = request.headers['x-primary-user-id']
  const categoryId = request.params.id
  const { name, icon, color } = request.body || {}
  // Если переданы name, icon, color - обновляем их перед soft delete
  // Это нужно для сохранения актуальных значений в истории транзакций
  if (name && icon && color) {
    db.run("UPDATE custom_categories SET name = ?, icon = ?, color = ?, is_deleted = 1 WHERE id = ? AND user_id = ?", 
      [name, icon, color, categoryId, userId], 
      () => {
        // Удаляем лимиты для этой категории
        db.run("DELETE FROM category_limits WHERE user_id = ? AND category_id = ?", [userId, categoryId], () => reply.send({ status: 'ok' }))
      }
    )
  } else {
    // Soft delete: устанавливаем is_deleted = 1 вместо удаления записи
    db.run("UPDATE custom_categories SET is_deleted = 1 WHERE id = ? AND user_id = ?", [categoryId, userId], () => {
      // Удаляем лимиты для этой категории
      db.run("DELETE FROM category_limits WHERE user_id = ? AND category_id = ?", [userId, categoryId], () => reply.send({ status: 'ok' }))
    })
  }
})

// CATEGORY OVERRIDES
fastify.get('/category-overrides', (request, reply) => {
  const userId = request.headers['x-primary-user-id']
  db.all("SELECT category_id, data FROM category_overrides WHERE user_id = ?", [userId], (err, rows) => {
    const map = {};
    (rows || []).forEach(r => { try { map[r.category_id] = JSON.parse(r.data) } catch (e) { map[r.category_id] = {} } })
    reply.send(map)
  })
})

fastify.post('/category-overrides/:categoryId', (request, reply) => {
  const userId = request.headers['x-primary-user-id']
  const json = JSON.stringify(request.body || {})
  db.run("INSERT OR REPLACE INTO category_overrides (user_id, category_id, data) VALUES (?, ?, ?)", [userId, request.params.categoryId, json], (err) => reply.send({ status: 'ok' }))
})

fastify.delete('/category-overrides/:categoryId', (request, reply) => {
  const userId = request.headers['x-primary-user-id']
  db.run("DELETE FROM category_overrides WHERE user_id = ? AND category_id = ?", [userId, request.params.categoryId], () => reply.send({ status: 'deleted' }))
})

// ACCOUNTS
fastify.get('/accounts', (request, reply) => {
  const userId = request.headers['x-primary-user-id']
  db.all("SELECT * FROM accounts WHERE user_id = ? ORDER BY created_at ASC", [userId], (err, rows) => reply.send(rows || []))
})

fastify.post('/accounts', (request, reply) => {
  const userId = request.headers['x-primary-user-id']
  const { name, balance, type, currency, color } = request.body
  const now = new Date().toISOString()
  db.run("INSERT INTO accounts (user_id, name, balance, type, currency, color, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)", [userId, name, balance || 0, type || 'cash', currency || 'RUB', color || '#CAFFBF', now, now], function(err) {
    reply.send({ id: this.lastID, status: 'created' })
  })
})

fastify.put('/accounts/:id', (request, reply) => {
  const userId = request.headers['x-primary-user-id']
  const { id } = request.params
  const { name, balance, type, color } = request.body
  const updates = [], params = []
  if (name) { updates.push('name = ?'); params.push(name) }
  if (balance !== undefined) { updates.push('balance = ?'); params.push(balance) }
  if (type) { updates.push('type = ?'); params.push(type) }
  if (color) { updates.push('color = ?'); params.push(color) }
  updates.push('updated_at = ?'); params.push(new Date().toISOString())
  params.push(id); params.push(userId)
  db.run(`UPDATE accounts SET ${updates.join(', ')} WHERE id = ? AND user_id = ?`, params, () => reply.send({ status: 'updated' }))
})

fastify.delete('/accounts/:id', (request, reply) => {
  const userId = request.headers['x-primary-user-id']
  db.run("DELETE FROM accounts WHERE id = ? AND user_id = ?", [request.params.id, userId], () => reply.send({ status: 'deleted' }))
})

// GOALS
fastify.get('/goals', (request, reply) => {
  const userId = request.headers['x-primary-user-id']
  db.all("SELECT * FROM savings_goals WHERE user_id = ? ORDER BY created_at ASC", [userId], (err, rows) => reply.send(rows || []))
})

fastify.post('/goals', (request, reply) => {
  const userId = request.headers['x-primary-user-id']
  const { name, target_amount, category, icon, color, deadline } = request.body
  const now = new Date().toISOString()
  db.run("INSERT INTO savings_goals (user_id, name, target_amount, current_amount, category, icon, color, deadline, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", [userId, name, target_amount, 0, category || 'personal', icon || '🐷', color || '#FFFFFC', deadline || null, now, now], function(err) {
    reply.send({ id: this.lastID, status: 'created' })
  })
})

fastify.put('/goals/:id', (request, reply) => {
  const userId = request.headers['x-primary-user-id']
  const { id } = request.params
  const { name, target_amount, current_amount, color, deadline, icon } = request.body
  const updates = [], params = []
  if (name) { updates.push('name = ?'); params.push(name) }
  if (target_amount) { updates.push('target_amount = ?'); params.push(target_amount) }
  if (current_amount !== undefined) { updates.push('current_amount = ?'); params.push(current_amount) }
  if (color) { updates.push('color = ?'); params.push(color) }
  if (icon) { updates.push('icon = ?'); params.push(icon) }
  if (deadline !== undefined) { updates.push('deadline = ?'); params.push(deadline) }
  updates.push('updated_at = ?'); params.push(new Date().toISOString())
  params.push(id); params.push(userId)
  db.run(`UPDATE savings_goals SET ${updates.join(', ')} WHERE id = ? AND user_id = ?`, params, () => reply.send({ status: 'updated' }))
})

fastify.delete('/goals/:id', (request, reply) => {
  const userId = request.headers['x-primary-user-id']
  db.run("DELETE FROM savings_goals WHERE id = ? AND user_id = ?", [request.params.id, userId], () => reply.send({ status: 'deleted' }))
})

// TRANSFER
fastify.post('/transfer', (request, reply) => {
  const userId = request.headers['x-primary-user-id']
  const { from_type, from_id, to_type, to_id, amount, description } = request.body
  const now = new Date().toISOString()
  db.serialize(() => {
    db.run("BEGIN TRANSACTION")
    if (from_type === 'account') db.run("UPDATE accounts SET balance = balance - ? WHERE id = ? AND user_id = ?", [amount, from_id, userId])
    else if (from_type === 'goal') db.run("UPDATE savings_goals SET current_amount = current_amount - ? WHERE id = ? AND user_id = ?", [amount, from_id, userId])
    
    if (to_type === 'account') db.run("UPDATE accounts SET balance = balance + ? WHERE id = ? AND user_id = ?", [amount, to_id, userId])
    else if (to_type === 'goal') db.run("UPDATE savings_goals SET current_amount = current_amount + ? WHERE id = ? AND user_id = ?", [amount, to_id, userId])
    
    db.run("INSERT INTO transfers (user_id, from_type, from_id, to_type, to_id, amount, date, description) VALUES (?, ?, ?, ?, ?, ?, ?, ?)", [userId, from_type, from_id, to_type, to_id, amount, now, description || ''], function(err) {
      if (err) db.run("ROLLBACK", () => reply.code(500).send({ error: err.message }))
      else db.run("COMMIT", () => reply.send({ id: this.lastID, status: 'transferred' }))
    })
  })
})

// TOTAL BALANCE
fastify.get('/total-balance', (request, reply) => {
  const userId = request.headers['x-primary-user-id']
  db.get("SELECT SUM(balance) as total FROM accounts WHERE user_id = ?", [userId], (err, row) => reply.send({ total: row && row.total ? row.total : 0 }))
})

// REMINDERS
fastify.get('/reminders', (request, reply) => {
  const userId = request.headers['x-primary-user-id']
  db.all("SELECT * FROM reminders WHERE user_id = ? ORDER BY time ASC", [userId], (err, rows) => reply.send(rows || []))
})

fastify.post('/reminders', (request, reply) => {
  const userId = request.headers['x-primary-user-id']
  const { title, frequency, time, start_date, end_date, timezone_offset } = request.body
  db.run("INSERT INTO reminders (user_id, title, frequency, time, start_date, end_date, timezone_offset, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)", [userId, title, frequency || 'once', time, start_date || null, end_date || null, timezone_offset || 0, new Date().toISOString()], function(err) {
    reply.send({ id: this.lastID, status: 'created' })
  })
})

fastify.put('/reminders/:id', (request, reply) => {
  const userId = request.headers['x-primary-user-id']
  const { id } = request.params
  const { title, frequency, time, start_date, end_date, is_active, timezone_offset } = request.body
  const updates = [], params = []
  if (title !== undefined) { updates.push('title = ?'); params.push(title) }
  if (frequency !== undefined) { updates.push('frequency = ?'); params.push(frequency) }
  if (time !== undefined) { updates.push('time = ?'); params.push(time) }
  if (start_date !== undefined) { updates.push('start_date = ?'); params.push(start_date) }
  if (end_date !== undefined) { updates.push('end_date = ?'); params.push(end_date) }
  if (is_active !== undefined) { updates.push('is_active = ?'); params.push(is_active) }
  if (timezone_offset !== undefined) { updates.push('timezone_offset = ?'); params.push(timezone_offset) }
  updates.push('last_sent = NULL')
  params.push(id); params.push(userId)
  db.run(`UPDATE reminders SET ${updates.join(', ')} WHERE id = ? AND user_id = ?`, params, () => reply.send({ status: 'updated' }))
})

fastify.delete('/reminders/:id', (request, reply) => {
  const userId = request.headers['x-primary-user-id']
  db.run("DELETE FROM reminders WHERE id = ? AND user_id = ?", [request.params.id, userId], () => reply.send({ status: 'deleted' }))
})

// BUDGET PERIOD SETTINGS
fastify.get('/budget-period-settings', (request, reply) => {
  const userId = request.headers['x-primary-user-id']
  db.get("SELECT budget_mode, custom_period_day FROM user_budget_settings WHERE user_id = ?", [userId], (err, row) => {
    if (row) return reply.send({ period_type: row.budget_mode === 'monthly' ? 'calendar_month' : 'custom_period', period_start_day: row.custom_period_day })
    return reply.send({ period_type: 'calendar_month', period_start_day: 1 })
  })
})

fastify.post('/budget-period-settings', (request, reply) => {
  const userId = request.headers['x-primary-user-id']
  const { period_type, period_start_day } = request.body
  const budget_mode = period_type === 'calendar_month' ? 'monthly' : 'custom'
  const day = period_start_day || 1
  db.run("INSERT OR REPLACE INTO user_budget_settings (user_id, budget_mode, custom_period_day) VALUES (?, ?, ?)", [userId, budget_mode, day], () => reply.send({ status: 'ok', period_type, period_start_day: day }))
})

// LINKED ACCOUNTS
fastify.post('/link-account', async (request, reply) => {
  const currentUserId = request.headers['x-user-id']
  const { primary_user_id } = request.body
  db.run("INSERT OR REPLACE INTO user_links (telegram_id, primary_user_id) VALUES (?, ?)", [currentUserId, primary_user_id], () => reply.send({ status: 'linked', telegram_id: currentUserId, primary_user_id }))
})

fastify.delete('/unlink-account', async (request, reply) => {
  const currentUserId = request.headers['x-user-id']
  db.run("DELETE FROM user_links WHERE telegram_id = ?", [currentUserId], () => reply.send({ status: 'unlinked', telegram_id: currentUserId }))
})

fastify.get('/linked-accounts', async (request, reply) => {
  const userId = request.headers['x-primary-user-id']
  db.all("SELECT telegram_id, primary_user_id FROM user_links WHERE primary_user_id = ? OR telegram_id = ?", [userId, userId], (err, rows) => reply.send({ primary_user_id: parseInt(userId), linked_accounts: rows || [] }))
})

// LOG CLIENT
fastify.post('/log-client', (request, reply) => {
  console.log('🔵 CLIENT LOG:', request.body.message, request.body.data)
  return reply.send({ status: 'logged' })
})

// RESET DATA
fastify.post('/reset-all-data', (request, reply) => {
  const userId = request.headers['x-user-id']
  const tables = ['transactions', 'accounts', 'savings_goals', 'user_settings', 'category_limits', 'custom_categories', 'transfers']
  const promises = tables.map(t => new Promise(res => db.run(`DELETE FROM ${t} WHERE user_id = ?`, [userId], res)))
  promises.push(new Promise(res => db.run('DELETE FROM user_links WHERE telegram_id = ? OR primary_user_id = ?', [userId, userId], res)))
  Promise.all(promises).then(() => reply.send({ status: 'success' })).catch(err => reply.code(500).send({ error: err.message }))
})

// STATIC & SPA
fastify.setNotFoundHandler(async (req, res) => {
  const url = req.url.split('?')[0]
  const publicDir = path.join(__dirname, 'public')
  
  let filePath
  if (url.startsWith('/uploads/')) {
    filePath = path.join(publicDir, url)
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
    const mimeTypes = { '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.gif': 'image/gif', '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.woff': 'font/woff', '.woff2': 'font/woff2', '.ttf': 'font/ttf', '.eot': 'application/vnd.ms-fontobject' }
    return res.type(mimeTypes[ext] || 'application/octet-stream').send(fileContent)
  } catch (err) {
    return res.code(404).send('File not found')
  }
})

const start = async () => {
  try {
    await fastify.listen({ port: 3000, host: '0.0.0.0' })
    console.log('Сервер запущен на порту 3000')
  } catch (err) {
    fastify.log.error(err)
    process.exit(1)
  }
}
start()
