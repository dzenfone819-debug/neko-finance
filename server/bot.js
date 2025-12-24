const { Telegraf } = require('telegraf')
const { GoogleGenerativeAI, SchemaType } = require('@google/generative-ai')
const axios = require('axios')

// СПИСОК КАТЕГОРИЙ (СТРОГО КАК В ПРИЛОЖЕНИИ)
// ID должны 1-в-1 совпадать с client/src/data/constants.tsx
const CATEGORIES_LIST = `
1. groceries (продукты, супермаркет, магазин, еда домой, пятерочка, магнит)
2. food (кафе, ресторан, кофе, обед, фастфуд, макдак, шаурма)
3. transport (личное авто, бензин, заправка, мойка, шиномонтаж, парковка, штраф)
4. commute (проезд, общественный транспорт, такси, автобус, метро, электричка, убер)
5. mortgage (ипотека, аренда квартиры)
6. bills (КУ, коммуналка, свет, вода, интернет, мобильная связь, жкх)
7. subs (подписки, сервисы, яндекс плюс, музыка, кинопоиск, spotify, облако)
8. split (сплит, долг, скинулись, общий чек)
9. home (товары для дома, уют, ремонт, мебель, бытовая химия, икеа)
10. personal (покупки себе, одежда, обувь, косметика, стрижка, аптека, врачи)
11. fun (развлечения, кино, игры, steam, бар, алкоголь, тусовка, хобби)
12. reserve (резерв, копилка, отложил, сбережения)
`

function startBot(botToken, db, geminiKey) {
  const bot = new Telegraf(botToken)
  const genAI = new GoogleGenerativeAI(geminiKey)

  // --- SCHEDULER FOR REMINDERS ---
  setInterval(() => {
    checkReminders(db, bot)
  }, 60000) // Check every minute

  // Используем Gemini 1.5 Pro (или Flash, если Pro недоступна)
  const model = genAI.getGenerativeModel({
    model: "gemini-2.5-flash-lite", 
    generationConfig: {
      responseMimeType: "application/json"
    }
  });

  const SYSTEM_PROMPT = `
  Ты финансовый ассистент Neko Finance. 
  Твоя задача - извлечь сумму расхода, категорию и опциональное название счета из сообщения.
  
  Если валюта не указана, считай что это рубли (RUB).
  
  СТРОГО выбери категорию ID из этого списка:
  ${CATEGORIES_LIST}
  
  Если подходящей категории нет, используй "groceries" (как самую частую) или ту, что ближе по смыслу.
  
  Если в начале сообщения указан счет (например "Счет1:", "Карта:", "Наличные:"), извлеки его название.
  
  Верни ТОЛЬКО JSON объект.
  Примеры: 
  {"amount": 500, "category": "bills", "description": "оплата интернета"}
  {"amount": 500, "category": "bills", "description": "оплата интернета", "account": "Счет1"}
  `

  // --- AI-обработчики временно отключены ---
  // bot.on('text', ...)
  // bot.on('voice', ...)

  bot.start((ctx) => ctx.reply('Мяу! Напиши "500 интернет" или "300 такси".'))
  bot.launch()
  
  process.once('SIGINT', () => bot.stop('SIGINT'))
  process.once('SIGTERM', () => bot.stop('SIGTERM'))
  console.log('🤖 AI Bot обновлен и запущен!')
}

// --- SCHEDULER LOGIC ---
function checkReminders(db, bot) {
  const now = new Date()
  const currentISO = now.toISOString()
  
  // Получаем все активные напоминания
  db.all("SELECT * FROM reminders WHERE is_active = 1", [], (err, rows) => {
    if (err) {
      console.error('Error checking reminders:', err)
      return
    }
    
    if (!rows || rows.length === 0) return

    rows.forEach(reminder => {
      // 1. Проверяем даты начала и конца
      if (reminder.start_date && new Date(reminder.start_date) > now) return
      if (reminder.end_date && new Date(reminder.end_date) < now) return

      // 2. Вычисляем текущее время пользователя
      // reminder.timezone_offset - это смещение в минутах (JS формат: UTC - Local).
      // Например, для Москвы (UTC+3) offset = -180.
      // Чтобы получить время пользователя: Time = UTC - Offset
      // (12:00 UTC) - (-180 min) = 15:00.
      
      // Берем текущий UTC timestamp
      const currentUtcTimestamp = now.getTime();
      
      // Вычисляем "сдвинутый" timestamp, который при отображении как UTC даст время пользователя
      const userTimeShifted = new Date(currentUtcTimestamp - (reminder.timezone_offset * 60000));
      
      // Используем getUTC methods, чтобы игнорировать таймзону сервера
      const userHours = userTimeShifted.getUTCHours().toString().padStart(2, '0');
      const userMinutes = userTimeShifted.getUTCMinutes().toString().padStart(2, '0');
      const currentTimeStr = `${userHours}:${userMinutes}`;
      
      // Сравниваем время
      if (currentTimeStr === reminder.time) {
        // Проверяем frequency и last_sent
        let shouldSend = false
        
        if (!reminder.last_sent) {
          shouldSend = true
        } else {
          const lastSentDate = new Date(reminder.last_sent)
          // Adjust lastSent to user timezone too for date comparison?
          // Или просто проверим, было ли отправлено сегодня?
          
          // Для простоты: проверяем разницу во времени
          const timeDiff = now.getTime() - lastSentDate.getTime()
          
          if (reminder.frequency === 'daily') {
             // Если прошло больше 20 часов, считаем что пора (защита от дублей в ту же минуту)
             if (timeDiff > 20 * 60 * 60 * 1000) shouldSend = true
          } else if (reminder.frequency === 'weekly') {
             if (timeDiff > 6 * 24 * 60 * 60 * 1000) shouldSend = true
          } else if (reminder.frequency === 'monthly') {
             if (timeDiff > 27 * 24 * 60 * 60 * 1000) shouldSend = true
          } else if (reminder.frequency === 'once') {
             shouldSend = false // Already sent
          }
        }

        if (shouldSend) {
          console.log(`🔔 Sending reminder "${reminder.title}" to user ${reminder.user_id}`)
          bot.telegram.sendMessage(reminder.user_id, `🔔 Напоминание: ${reminder.title}`)
            .then(() => {
              // Обновляем last_sent
              db.run("UPDATE reminders SET last_sent = ? WHERE id = ?", [currentISO, reminder.id])
              
              // Если 'once', деактивируем
              if (reminder.frequency === 'once') {
                db.run("UPDATE reminders SET is_active = 0 WHERE id = ?", [reminder.id])
              }
            })
            .catch(e => console.error('Failed to send reminder:', e))
        }
      }
    })
  })
}

// --- ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ---

function cleanJson(text) {
  let clean = text.replace(/```json/g, '').replace(/```/g, '').trim();
  try {
    return JSON.parse(clean);
  } catch (e) {
    console.error("Bad JSON from AI:", text);
    throw new Error("Invalid JSON");
  }
}

async function processWithAI(model, prompt, text) {
  const result = await model.generateContent([prompt, text])
  return cleanJson(result.response.text())
}

async function saveTransaction(ctx, db, data) {
  const { amount, category, description, account } = data
  const userId = ctx.from.id

  if (!amount || amount <= 0) {
    return ctx.reply('😿 Не понял сумму. Напиши, например: "100 хлеб" или "Счет1: 500 интернет"')
  }

  // Проверка на валидность категории (на всякий случай)
  const validCategories = [
    'groceries', 'food', 'transport', 'commute', 'mortgage', 
    'bills', 'subs', 'split', 'home', 'personal', 'fun', 'reserve'
  ];
  
  const finalCategory = validCategories.includes(category) ? category : 'groceries';

  // Если указан счет, сначала ищем его по названию
  let accountId = null;
  if (account) {
    db.get(
      "SELECT id FROM accounts WHERE user_id = ? AND name = ? LIMIT 1",
      [userId, account],
      (err, row) => {
        if (row) accountId = row.id;
        insertTransaction();
      }
    );
  } else {
    insertTransaction();
  }

  function insertTransaction() {
    const query = `INSERT INTO transactions (amount, category, date, user_id, type, account_id) VALUES (?, ?, ?, ?, ?, ?)`
    const now = new Date().toISOString()

    db.run(query, [amount, finalCategory, now, userId, 'expense', accountId || null], function(err) {
      if (err) {
        console.error(err)
        ctx.reply('Ошибка базы данных')
      } else {
        // Если указан счет, вычитаем сумму из баланса счета
        if (accountId) {
          db.run("UPDATE accounts SET balance = balance - ? WHERE id = ?", [amount, accountId]);
        }
        // Красивый ответ
        const accountInfo = account ? `\n💳 На счет: ${account}` : '';
        ctx.reply(`✅ Расход: ${amount}₽\n📂 Категория: ${getCategoryName(finalCategory)}\n📝 ${description || ''}${accountInfo}`)
      }
    })
  }
}

// Функция для красивого отображения в чате (Синхронизировано с App)
function getCategoryName(id) {
  const names = {
    'groceries': '🛒 Еда (продукты)',
    'food': '☕ Кафе',
    'transport': '🚗 Транспорт (Авто)',
    'commute': '🚌 Проезд/Такси',
    'mortgage': '🏠 Ипотека',
    'bills': '⚡ КУ (Счета)',   // <-- Вот теперь тут правильно!
    'subs': '🔄 Подписки',
    'split': '➗ Сплит',
    'home': '🛋️ Дом',
    'personal': '👕 Себе',
    'fun': '🎮 Развлечения',
    'reserve': '🐷 Резерв'
  }
  return names[id] || id
}

module.exports = { startBot }