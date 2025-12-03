const { Telegraf } = require('telegraf')
const { GoogleGenerativeAI, SchemaType } = require('@google/generative-ai')
const axios = require('axios')

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

  const model = genAI.getGenerativeModel({
  model: "gemini-2.5-flash", // <-- Железобетонный вариант
  generationConfig: {
    responseMimeType: "application/json"
  }
});

  const SYSTEM_PROMPT = `
  Ты финансовый ассистент. Твоя задача - извлечь сумму расхода и категорию из сообщения пользователя.
  Если валюта не указана, считай что это рубли.
  Выбери наиболее подходящую категорию из списка:
  ${CATEGORIES_LIST}
  
  Если категория не очевидна, используй "general".
  Верни ТОЛЬКО JSON объект без markdown форматирования.
  Пример: {"amount": 100, "category": "food", "description": "кофе"}
  `

  // --- ОБРАБОТЧИК ТЕКСТА ---
  bot.on('text', async (ctx) => {
    try {
      const userText = ctx.message.text
      if (userText.startsWith('/')) return 
      
      console.log(`[AI] Обработка текста: "${userText}"`) // ЛОГ
      const result = await processWithAI(model, SYSTEM_PROMPT, userText)
      await saveTransaction(ctx, db, result)
      
    } catch (e) {
      console.error('[AI Error]', e) // ВИДИМ РЕАЛЬНУЮ ОШИБКУ
      ctx.reply('😿 Ошибка обработки. Проверь консоль сервера.')
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
      ctx.reply('😿 Не расслышал...')
    }
  })

  bot.start((ctx) => ctx.reply('Мяу! Пиши траты текстом или голосом.'))
  bot.launch()
  
  process.once('SIGINT', () => bot.stop('SIGINT'))
  process.once('SIGTERM', () => bot.stop('SIGTERM'))
  console.log('🤖 AI Bot запущен!')
}

// --- ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ---

// Функция очистки от мусора (Markdown, backticks)
function cleanJson(text) {
  console.log('[AI Raw Response]:', text) // Смотрим, что ответил ИИ
  let clean = text.replace(/```json/g, '').replace(/```/g, '').trim();
  return JSON.parse(clean);
}

async function processWithAI(model, prompt, text) {
  const result = await model.generateContent([prompt, text])
  return cleanJson(result.response.text())
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
      ctx.reply(`✅ Расход: ${amount}₽\n📂 Категория: ${getCategoryName(category)}\n📝 ${description || ''}`)
    }
  })
}

function getCategoryName(id) {
  // ... (оставь как было) ...
  const names = {
    'groceries': '🛒 Продукты', 'food': '☕ Кафе', 'transport': '🚗 Авто',
    'commute': '🚌 Проезд', 'mortgage': '🏠 Ипотека', 'bills': '⚡ Счета',
    'subs': '🔄 Подписки', 'home': '🛋️ Дом', 'personal': '👕 Себе',
    'fun': '🎮 Развлечения', 'reserve': '🐷 Копилка'
  }
  return names[id] || id
}

module.exports = { startBot }