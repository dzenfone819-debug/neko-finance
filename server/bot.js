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

  // Используем Gemini 1.5 Pro (или Flash, если Pro недоступна)
  const model = genAI.getGenerativeModel({
    model: "gemini-2.5-flash-lite", 
    generationConfig: {
      responseMimeType: "application/json"
    }
  });

  const SYSTEM_PROMPT = `
  Ты финансовый ассистент Neko Finance. 
  Твоя задача - извлечь сумму расхода и категорию из сообщения.
  
  Если валюта не указана, считай что это рубли (RUB).
  
  СТРОГО выбери категорию ID из этого списка:
  ${CATEGORIES_LIST}
  
  Если подходящей категории нет, используй "groceries" (как самую частую) или ту, что ближе по смыслу.
  
  Верни ТОЛЬКО JSON объект.
  Пример: {"amount": 500, "category": "bills", "description": "оплата интернета"}
  `

  // --- ОБРАБОТЧИК ТЕКСТА ---
  bot.on('text', async (ctx) => {
    try {
      const userText = ctx.message.text
      if (userText.startsWith('/')) return 
      
      console.log(`[AI] Текст: "${userText}"`)
      const result = await processWithAI(model, SYSTEM_PROMPT, userText)
      await saveTransaction(ctx, db, result)
      
    } catch (e) {
      console.error('[AI Error]', e)
      ctx.reply('😿 Ошибка. Попробуй перефразировать.')
    }
  })

  // --- ОБРАБОТЧИК ГОЛОСА ---
  bot.on('voice', async (ctx) => {
    try {
      ctx.sendChatAction('typing')
      const fileId = ctx.message.voice.file_id
      const fileLink = await ctx.telegram.getFileLink(fileId)
      const response = await axios({ url: fileLink.href, responseType: 'arraybuffer' })
      const audioBuffer = Buffer.from(response.data)

      const result = await model.generateContent([
        SYSTEM_PROMPT,
        {
          inlineData: {
            mimeType: "audio/ogg",
            data: audioBuffer.toString("base64")
          }
        }
      ])

      const jsonData = cleanJson(result.response.text())
      await saveTransaction(ctx, db, jsonData)

    } catch (e) {
      console.error('[AI Voice Error]', e)
      ctx.reply('😿 Не удалось распознать голос. Сервера Google перегружены.')
    }
  })

  bot.start((ctx) => ctx.reply('Мяу! Напиши "500 интернет" или "300 такси".'))
  bot.launch()
  
  process.once('SIGINT', () => bot.stop('SIGINT'))
  process.once('SIGTERM', () => bot.stop('SIGTERM'))
  console.log('🤖 AI Bot обновлен и запущен!')
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
  const { amount, category, description } = data
  const userId = ctx.from.id

  if (!amount || amount <= 0) {
    return ctx.reply('😿 Не понял сумму. Напиши, например: "100 хлеб"')
  }

  // Проверка на валидность категории (на всякий случай)
  const validCategories = [
    'groceries', 'food', 'transport', 'commute', 'mortgage', 
    'bills', 'subs', 'split', 'home', 'personal', 'fun', 'reserve'
  ];
  
  const finalCategory = validCategories.includes(category) ? category : 'groceries';

  const query = `INSERT INTO transactions (amount, category, date, user_id) VALUES (?, ?, ?, ?)`
  const now = new Date().toISOString()

  db.run(query, [amount, finalCategory, now, userId], function(err) {
    if (err) {
      console.error(err)
      ctx.reply('Ошибка базы данных')
    } else {
      // Тут мы используем красивые названия для ответа пользователю
      ctx.reply(`✅ Расход: ${amount}₽\n📂 Категория: ${getCategoryName(finalCategory)}\n📝 ${description || ''}`)
    }
  })
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