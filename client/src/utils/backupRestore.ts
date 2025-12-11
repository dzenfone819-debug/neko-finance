/**
 * Backup and Restore utilities for full database export/import
 * Supports JSON format for complete data backup
 */

interface BackupData {
  version: string
  exportDate: string
  data: {
    transactions: any[]
    accounts: any[]
    budgetSettings: any
    categories: any[]
  }
}

/**
 * Export all data to JSON file
 */
export async function exportBackup(
  transactions: any[],
  accounts: any[],
  budgetSettings: any,
  categories: any[]
): Promise<void> {
  const backup: BackupData = {
    version: '1.0',
    exportDate: new Date().toISOString(),
    data: {
      transactions,
      accounts,
      budgetSettings,
      categories
    }
  }

  const jsonString = JSON.stringify(backup, null, 2)
  const blob = new Blob([jsonString], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  
  const link = document.createElement('a')
  link.href = url
  link.download = `neko-finance-backup-${new Date().toISOString().split('T')[0]}.json`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)

  console.log('✅ Бэкап экспортирован')
}

/**
 * Import data from JSON file
 */
export async function importBackup(file: File): Promise<BackupData | null> {
  try {
    const text = await file.text()
    const backup: BackupData = JSON.parse(text)

    // Validate backup structure
    if (!backup.version || !backup.data) {
      throw new Error('Неверный формат файла бэкапа')
    }

    console.log('✅ Бэкап загружен из файла')
    return backup
  } catch (error) {
    console.error('❌ Ошибка импорта бэкапа:', error)
    return null
  }
}

/**
 * Restore transactions from backup
 */
export async function restoreTransactions(
  userId: string,
  transactions: any[]
): Promise<boolean> {
  try {
    const baseUrl = import.meta.env.VITE_API_URL || 'https://neko-finance.zenfone.ru/api'
    
    // Delete existing transactions first (optional - could be configurable)
    // For now, we'll just add new ones without deleting
    
    for (const transaction of transactions) {
      const response = await fetch(`${baseUrl}/transactions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Primary-User-ID': userId
        },
        body: JSON.stringify({
          type: transaction.type,
          category: transaction.category,
          amount: transaction.amount,
          date: transaction.date,
          account_id: transaction.account_id || null
        })
      })

      if (!response.ok) {
        console.error(`Ошибка восстановления транзакции ${transaction.id}`)
      }
    }

    console.log('✅ Транзакции восстановлены')
    return true
  } catch (error) {
    console.error('❌ Ошибка восстановления транзакций:', error)
    return false
  }
}

/**
 * Restore accounts from backup
 */
export async function restoreAccounts(
  userId: string,
  accounts: any[]
): Promise<boolean> {
  try {
    const baseUrl = import.meta.env.VITE_API_URL || 'https://neko-finance.zenfone.ru/api'
    
    for (const account of accounts) {
      const response = await fetch(`${baseUrl}/accounts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Primary-User-ID': userId
        },
        body: JSON.stringify({
          name: account.name,
          balance: account.balance,
          icon: account.icon || '💳'
        })
      })

      if (!response.ok) {
        console.error(`Ошибка восстановления счёта ${account.name}`)
      }
    }

    console.log('✅ Счета восстановлены')
    return true
  } catch (error) {
    console.error('❌ Ошибка восстановления счетов:', error)
    return false
  }
}

/**
 * Restore budget settings from backup
 */
export async function restoreBudgetSettings(
  userId: string,
  budgetSettings: any
): Promise<boolean> {
  try {
    const baseUrl = import.meta.env.VITE_API_URL || 'https://neko-finance.zenfone.ru/api'
    
    const response = await fetch(`${baseUrl}/settings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Primary-User-ID': userId
      },
      body: JSON.stringify({
        budget: budgetSettings.budget_limit || budgetSettings.budget || 0
      })
    })

    if (!response.ok) {
      console.error('Ошибка восстановления бюджета')
      return false
    }

    console.log('✅ Настройки бюджета восстановлены')
    return true
  } catch (error) {
    console.error('❌ Ошибка восстановления бюджета:', error)
    return false
  }
}

/**
 * Full restore process
 */
export async function performFullRestore(
  userId: string,
  backup: BackupData,
  options: {
    restoreTransactions?: boolean
    restoreAccounts?: boolean
    restoreBudget?: boolean
  } = {
    restoreTransactions: true,
    restoreAccounts: true,
    restoreBudget: true
  }
): Promise<boolean> {
  try {
    const results: boolean[] = []

    if (options.restoreAccounts && backup.data.accounts) {
      results.push(await restoreAccounts(userId, backup.data.accounts))
    }

    if (options.restoreBudget && backup.data.budgetSettings) {
      results.push(await restoreBudgetSettings(userId, backup.data.budgetSettings))
    }

    if (options.restoreTransactions && backup.data.transactions) {
      results.push(await restoreTransactions(userId, backup.data.transactions))
    }

    return results.every(r => r)
  } catch (error) {
    console.error('❌ Ошибка полного восстановления:', error)
    return false
  }
}
