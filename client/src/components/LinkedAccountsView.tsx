import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Link2, Unlink, Info, UserPlus, Check, X } from 'lucide-react'
import WebApp from '@twa-dev/sdk'
import * as api from '../api/nekoApi'

interface LinkedAccount {
  telegram_id: number
  primary_user_id: number
}

interface LinkedAccountsViewProps {
  userId: number | null
}

export function LinkedAccountsView({ userId }: LinkedAccountsViewProps) {
  const [linkedAccounts, setLinkedAccounts] = useState<LinkedAccount[]>([])
  const [primaryUserId, setPrimaryUserId] = useState<number | null>(null)
  const [isLinking, setIsLinking] = useState(false)
  const [linkUserId, setLinkUserId] = useState('')
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null)

  useEffect(() => {
    if (userId) {
      loadLinkedAccounts()
    }
  }, [userId])

  const loadLinkedAccounts = async () => {
    if (!userId) return
    try {
      const data = await api.getLinkedAccounts(userId)
      setLinkedAccounts(data.linked_accounts || [])
      setPrimaryUserId(data.primary_user_id)
    } catch (error) {
      console.error('Error loading linked accounts:', error)
      showMessage('Ошибка загрузки данных', 'error')
    }
  }

  const handleLinkAccount = async () => {
    if (!userId || !linkUserId) return
    
    const targetUserId = parseInt(linkUserId)
    if (isNaN(targetUserId)) {
      showMessage('Введите корректный ID', 'error')
      return
    }

    WebApp.HapticFeedback.impactOccurred('medium')
    
    try {
      await api.linkAccount(userId, targetUserId)
      showMessage('Аккаунт успешно привязан!', 'success')
      setLinkUserId('')
      setIsLinking(false)
      loadLinkedAccounts()
      WebApp.HapticFeedback.notificationOccurred('success')
    } catch (error) {
      console.error('Error linking account:', error)
      showMessage('Ошибка при привязке', 'error')
      WebApp.HapticFeedback.notificationOccurred('error')
    }
  }

  const handleUnlinkAccount = async () => {
    if (!userId) return
    
    WebApp.HapticFeedback.impactOccurred('medium')
    
    const confirmed = window.confirm('Вы уверены, что хотите отвязать свой аккаунт? Вы вернетесь к использованию отдельных данных.')
    if (!confirmed) return

    try {
      await api.unlinkAccount(userId)
      showMessage('Аккаунт отвязан', 'success')
      loadLinkedAccounts()
      WebApp.HapticFeedback.notificationOccurred('success')
    } catch (error) {
      console.error('Error unlinking account:', error)
      showMessage('Ошибка при отвязке', 'error')
      WebApp.HapticFeedback.notificationOccurred('error')
    }
  }

  const showMessage = (text: string, type: 'success' | 'error') => {
    setMessage({ text, type })
    setTimeout(() => setMessage(null), 3000)
  }

  const isLinked = linkedAccounts.some(acc => acc.telegram_id === userId)
  const isPrimary = primaryUserId === userId

  return (
    <div style={{
      width: '100%',
      height: '100%',
      overflowY: 'auto',
      padding: '20px',
      paddingBottom: '100px',
      boxSizing: 'border-box'
    }}>
      {/* Сообщение */}
      {message && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          style={{
            position: 'fixed',
            top: 20,
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 1000,
            background: message.type === 'success' ? '#27AE60' : '#E74C3C',
            color: 'white',
            padding: '12px 24px',
            borderRadius: 12,
            fontWeight: 'bold',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
          }}
        >
          {message.text}
        </motion.div>
      )}

      {/* Заголовок */}
      <div style={{
        textAlign: 'center',
        marginBottom: 25
      }}>
        <div style={{
          fontSize: 28,
          fontWeight: 'bold',
          color: '#6B4C75',
          marginBottom: 8
        }}>
          Связанные аккаунты
        </div>
        <div style={{
          fontSize: 13,
          color: '#6B4C75',
          opacity: 0.7,
          lineHeight: 1.5
        }}>
          Привяжите несколько Telegram аккаунтов<br/>для доступа к одним данным
        </div>
      </div>

      {/* Информационная карточка */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        style={{
          background: 'rgba(102, 126, 234, 0.1)',
          borderRadius: 16,
          padding: '16px',
          marginBottom: 20,
          display: 'flex',
          gap: 12,
          alignItems: 'flex-start'
        }}
      >
        <Info size={20} color="#667eea" style={{ flexShrink: 0, marginTop: 2 }} />
        <div style={{ fontSize: 13, color: '#6B4C75', lineHeight: 1.6 }}>
          <strong>Текущий ID:</strong> {userId}<br/>
          {isLinked && (
            <>
              <strong>Главный аккаунт:</strong> {primaryUserId}<br/>
              <strong>Статус:</strong> {isPrimary ? 'Главный аккаунт' : 'Связанный аккаунт'}
            </>
          )}
          {!isLinked && (
            <span style={{ opacity: 0.7 }}>Ваш аккаунт не связан с другими</span>
          )}
        </div>
      </motion.div>

      {/* Связанные аккаунты */}
      {linkedAccounts.length > 0 && (
        <div style={{ marginBottom: 25 }}>
          <div style={{
            fontSize: 14,
            fontWeight: 'bold',
            color: '#6B4C75',
            marginBottom: 12,
            display: 'flex',
            alignItems: 'center',
            gap: 8
          }}>
            <Link2 size={18} />
            Связанные аккаунты ({linkedAccounts.length})
          </div>
          
          {linkedAccounts.map((acc, index) => (
            <motion.div
              key={acc.telegram_id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              style={{
                background: 'white',
                borderRadius: 12,
                padding: '14px 16px',
                marginBottom: 10,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
              }}
            >
              <div>
                <div style={{ fontWeight: 'bold', color: '#6B4C75', fontSize: 15 }}>
                  ID: {acc.telegram_id}
                </div>
                <div style={{ fontSize: 12, color: '#6B4C75', opacity: 0.6, marginTop: 2 }}>
                  {acc.telegram_id === primaryUserId ? 'Главный аккаунт' : `→ Привязан к ${acc.primary_user_id}`}
                </div>
              </div>
              {acc.telegram_id === userId && (
                <div style={{
                  background: '#27AE60',
                  color: 'white',
                  padding: '4px 10px',
                  borderRadius: 6,
                  fontSize: 11,
                  fontWeight: 'bold'
                }}>
                  ВЫ
                </div>
              )}
            </motion.div>
          ))}
        </div>
      )}

      {/* Кнопка привязки/отвязки */}
      {!isLinking && !isLinked && (
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={() => setIsLinking(true)}
          style={{
            width: '100%',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: 'white',
            border: 'none',
            borderRadius: 14,
            padding: '16px',
            fontSize: 16,
            fontWeight: 'bold',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 10,
            boxShadow: '0 4px 12px rgba(102, 126, 234, 0.3)',
            marginBottom: 12
          }}
        >
          <UserPlus size={20} />
          Привязать к аккаунту
        </motion.button>
      )}

      {/* Форма привязки */}
      {isLinking && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          style={{
            background: 'white',
            borderRadius: 16,
            padding: '20px',
            marginBottom: 20,
            boxShadow: '0 4px 16px rgba(0,0,0,0.1)'
          }}
        >
          <div style={{
            fontSize: 16,
            fontWeight: 'bold',
            color: '#6B4C75',
            marginBottom: 12
          }}>
            Введите ID главного аккаунта
          </div>
          
          <input
            type="number"
            placeholder="Например: 123456789"
            value={linkUserId}
            onChange={(e) => setLinkUserId(e.target.value)}
            style={{
              width: '100%',
              padding: '14px',
              border: '2px solid #E0E0E0',
              borderRadius: 12,
              fontSize: 15,
              marginBottom: 15,
              boxSizing: 'border-box',
              outline: 'none',
              fontFamily: 'inherit'
            }}
            onFocus={(e) => e.target.style.borderColor = '#667eea'}
            onBlur={(e) => e.target.style.borderColor = '#E0E0E0'}
          />

          <div style={{
            fontSize: 12,
            color: '#6B4C75',
            opacity: 0.7,
            marginBottom: 15,
            lineHeight: 1.5
          }}>
            💡 Узнайте ID главного аккаунта в этом же разделе на другом устройстве
          </div>

          <div style={{ display: 'flex', gap: 10 }}>
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={handleLinkAccount}
              disabled={!linkUserId}
              style={{
                flex: 1,
                background: linkUserId ? '#27AE60' : '#CCC',
                color: 'white',
                border: 'none',
                borderRadius: 12,
                padding: '14px',
                fontSize: 15,
                fontWeight: 'bold',
                cursor: linkUserId ? 'pointer' : 'not-allowed',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8
              }}
            >
              <Check size={18} />
              Привязать
            </motion.button>
            
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => {
                setIsLinking(false)
                setLinkUserId('')
              }}
              style={{
                flex: 1,
                background: '#E74C3C',
                color: 'white',
                border: 'none',
                borderRadius: 12,
                padding: '14px',
                fontSize: 15,
                fontWeight: 'bold',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8
              }}
            >
              <X size={18} />
              Отмена
            </motion.button>
          </div>
        </motion.div>
      )}

      {/* Кнопка отвязки */}
      {isLinked && !isPrimary && (
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={handleUnlinkAccount}
          style={{
            width: '100%',
            background: 'white',
            color: '#E74C3C',
            border: '2px solid #E74C3C',
            borderRadius: 14,
            padding: '16px',
            fontSize: 16,
            fontWeight: 'bold',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 10,
            marginTop: 12
          }}
        >
          <Unlink size={20} />
          Отвязать аккаунт
        </motion.button>
      )}

      {/* Предупреждение для главного аккаунта */}
      {isLinked && isPrimary && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          style={{
            background: 'rgba(255, 193, 7, 0.1)',
            borderRadius: 12,
            padding: '14px',
            marginTop: 20,
            fontSize: 13,
            color: '#6B4C75',
            lineHeight: 1.6
          }}
        >
          <strong>⚠️ Главный аккаунт</strong><br/>
          Вы не можете отвязаться, так как являетесь главным аккаунтом. Другие пользователи могут отвязаться от вас.
        </motion.div>
      )}
    </div>
  )
}
