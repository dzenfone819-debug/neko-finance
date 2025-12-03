const { Telegraf } = require('telegraf')
const { GoogleGenerativeAI, SchemaType } = require('@google/generative-ai')
const axios = require('axios')

// Список категорий (нужен, чтобы ИИ знал, из чего выбирать)
// Важно: ID категорий должны совпадать с теми, что на Фронтенде!
const CATEGORIES_LIST = `
- groceries (продукты, магазин, супермаркет)
- food (кафе, ресторан, кофе, обед)
- transport (бензин, такси, мойка, парковка, авто)
- commute (проезд, автобус, метро)
- mortgage (ипотека)
- bills (коммуналка, свет, интернет, связь)
- subs (подписки, сервисы)
- split (сплит)
- home (дом, ремонт, мебель, быт)
- personal (одежда, стрижка, аптека, врачи)
- fun (кино, игры, развлечения)
- reserve (копилка, отложил)
`

function startBot(botToken, db, geminiKey) {
  const bot = new Telegraf(botToken)
  const genAI = new GoogleGenerativeAI(geminiKey)

  // Настраиваем модель (Gemini 1.5 Flash - быстрая и дешевая)
  const model = genAI.getGenerativeModel({
    model: "gemini-1.5-flash",
    generationConfig: {
      responseMimeType: "application/json", // Заставляем отвечать только JSON-ом
      responseSchema: {
        type: SchemaType.OBJECT,
        properties: {
          amount: { type: SchemaType.NUMBER },
          category: { type: SchemaType.STRING },
          description: { type: SchemaType.STRING }, // Описание траты (напр. "шаурма")
        },
        required: ["amount", "category"]
      }
    }
  });

  // Системная инструкция для ИИ
  const SYSTEM_PROMPT = `
  Ты финансовый ассистент. Твоя задача - извлечь сумму расхода и категорию из сообщения пользователя.
  Если валюта не указана, считай что это рубли.
  Выбери наиболее подходящую категорию из списка:
  ${CATEGORIES_LIST}
  
  Если категория не очевидна, используй "general".
  Верни JSON.
  `

  // --- ОБРАБОТЧИК ТЕКСТА ---
  bot.on('text', async (ctx) => {
    try {
      const userText = ctx.message.text
      // Игнорируем команды вроде /start
      if (userText.startsWith('/')) return 
      
      const result = await processWithAI(model, SYSTEM_PROMPT, userText)
      await saveTransaction(ctx, db, result)
      
    } catch (e) {
      console.error(e)
      ctx.reply('😿 Не удалось распознать трату. Попробуй написать проще, например: "150 кофе"')
    }
  })

  // --- ОБРАБОТЧИК ГОЛОСА ---
  bot.on('voice', async (ctx) => {
    try {
      ctx.sendChatAction('typing') // Показываем, что бот думает...
      
      // 1. Получаем ссылку на файл
      const fileId = ctx.message.voice.file_id
      const fileLink = await ctx.telegram.getFileLink(fileId)
      
      // 2. Скачиваем файл как буфер (набор байтов)
      const response = await axios({ url: fileLink.href, responseType: 'arraybuffer' })
      const audioBuffer = Buffer.from(response.data)

      // 3. Формируем запрос к Gemini (Аудио + Промпт)
      const result = await model.generateContent([
        SYSTEM_PROMPT,
        {
          inlineData: {
            mimeType: "audio/ogg",
            data: audioBuffer.toString("base64")
          }
        }
      ])

      const jsonData = JSON.parse(result.response.text())
      await saveTransaction(ctx, db, jsonData)

    } catch (e) {
      console.error(e)
      ctx.reply('😿 Не расслышал... Попробуй сказать четче.')
    }
  })

  bot.start((ctx) => ctx.reply('Мяу! Я слушаю. \nНапиши "300 такси" или запиши голосовое "Купил продуктов на 2000 рублей".'))
  bot.launch()
  
  // Graceful stop
  process.once('SIGINT', () => bot.stop('SIGINT'))
  process.once('SIGTERM', () => bot.stop('SIGTERM'))
  console.log('🤖 AI Bot запущен!')
}

// --- ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ---

async function processWithAI(model, prompt, text) {
  const result = await model.generateContent([prompt, text])
  return JSON.parse(result.response.text())
}

async function saveTransaction(ctx, db, data) {
  const { amount, category, description } = data
  const userId = ctx.from.id

  if (!amount || amount <= 0) {
    return ctx.reply('Не нашел сумму в сообщении 😿')
  }

  const query = `INSERT INTO transactions (amount, category, date, user_id) VALUES (?, ?, ?, ?)`
  const now = new Date().toISOString()

  db.run(query, [amount, category, now, userId], function(err) {
    if (err) {
      console.error(err)
      ctx.reply('Ошибка базы данных')
    } else {
      ctx.reply(`✅ Расход: ${amount}₽\n📂 Категория: ${getCategoryName(category)}\n📝 Коммент: ${description || '-'}`)
    }
  })
}

function getCategoryName(id) {
  const names = {
    'groceries': '🛒 Продукты',
    'food': '☕ Кафе',
    'transport': '🚗 Авто',
    'commute': '🚌 Проезд',
    'mortgage': '🏠 Ипотека',
    'bills': '⚡ Счета',
    'subs': '🔄 Подписки',
    'home': '🛋️ Дом',
    'personal': '👕 Себе',
    'fun': '🎮 Развлечения',
    'reserve': '🐷 Копилка'
  }
  return names[id] || id
}

module.exports = { startBot }