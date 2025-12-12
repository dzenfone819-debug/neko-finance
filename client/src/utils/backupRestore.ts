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
    goals?: any[]
    budgetSettings: any
    categories: any[]
    limits?: any
  }
}

/**
 * Export all data to JSON file
 */
export async function exportBackup(
  transactions: any[],
  accounts: any[],
  goals: any[],
  budgetSettings: any,
  categories: any[],
  limits: any
): Promise<void> {
  const backup: BackupData = {
    version: '1.0',
    exportDate: new Date().toISOString(),
    data: {
      transactions,
      accounts,
      goals,
      budgetSettings,
      categories,
      limits
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

    // Ensure limits and goals exist for backwards compatibility
    if (!backup.data.limits) {
      backup.data.limits = {}
    }
    if (!backup.data.goals) {
      backup.data.goals = []
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
  transactions: any[],
  categoryIdMap: { [oldId: string]: string } = {}
): Promise<boolean> {
  try {
    // Delete existing transactions first (optional - could be configurable)
    // For now, we'll just add new ones without deleting
    
    for (const transaction of transactions) {
      // Map old custom category ID to new one
      let category = transaction.category
      if (category && category.startsWith('custom_') && categoryIdMap[category]) {
        category = categoryIdMap[category]
        console.log(`📝 Маппинг категории: ${transaction.category} → ${category}`)
      }
      
      const response = await fetch('/add-expense', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': userId
        },
        body: JSON.stringify({
          type: transaction.type,
          category: category,
          amount: transaction.amount,
          date: transaction.date,
          account_id: transaction.account_id || null,
          target_type: transaction.target_type || 'account'
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
    for (const account of accounts) {
      const response = await fetch('/accounts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-primary-user-id': userId
        },
        body: JSON.stringify({
          name: account.name,
          balance: account.balance,
          type: account.type || 'cash',
          color: account.color || '#CAFFBF'
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
    const response = await fetch('/settings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-primary-user-id': userId
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
 * Restore custom categories from backup
 * Returns mapping of old category IDs to new ones
 */
export async function restoreCustomCategories(
  userId: string,
  categories: any[],
  limits: any
): Promise<{ [oldId: string]: string }> {
  const categoryIdMap: { [oldId: string]: string } = {}
  
  try {
    for (const category of categories) {
      // Get limit for this category from limits object
      const categoryLimit = limits?.[category.id] || category.limit || 0
      
      const response = await fetch('/custom-categories', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-primary-user-id': userId
        },
        body: JSON.stringify({
          name: category.name,
          icon: category.icon || '📦',
          color: category.color || '#A0C4FF',
          limit: categoryLimit
        })
      })

      if (response.ok) {
        const result = await response.json()
        // Map old ID to new ID
        categoryIdMap[category.id] = result.id
        console.log(`✅ Категория ${category.name}: ${category.id} → ${result.id}`)
      } else {
        console.error(`Ошибка восстановления категории ${category.name}`)
      }
    }

    console.log('✅ Кастомные категории восстановлены')
    return categoryIdMap
  } catch (error) {
    console.error('❌ Ошибка восстановления категорий:', error)
    return categoryIdMap
  }
}

/**
 * Restore savings goals from backup
 */
export async function restoreGoals(
  userId: string,
  goals: any[]
): Promise<boolean> {
  try {
    for (const goal of goals) {
      const response = await fetch('/goals', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-primary-user-id': userId
        },
        body: JSON.stringify({
          name: goal.name,
          target_amount: goal.target_amount,
          category: goal.category || 'personal',
          icon: goal.icon || '🐷',
          color: goal.color || '#FFFFFC',
          deadline: goal.deadline || null
        })
      })

      if (response.ok) {
        // Update current_amount if needed
        if (goal.current_amount && goal.current_amount > 0) {
          const result = await response.json()
          await fetch(`/goals/${result.id}`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              'x-primary-user-id': userId
            },
            body: JSON.stringify({
              current_amount: goal.current_amount
            })
          })
        }
      } else {
        console.error(`Ошибка восстановления копилки ${goal.name}`)
      }
    }

    console.log('✅ Копилки восстановлены')
    return true
  } catch (error) {
    console.error('❌ Ошибка восстановления копилок:', error)
    return false
  }
}

/**
 * Restore category limits from backup (for standard categories only)
 */
export async function restoreCategoryLimits(
  userId: string,
  limits: any
): Promise<boolean> {
  try {
    // limits is an object like { "food": 5000, "transport": 2000, "custom_xxx": 3000 }
    for (const [category, limit] of Object.entries(limits)) {
      // Skip custom categories - their limits are set during category creation
      if (category.startsWith('custom_')) {
        continue
      }
      
      const response = await fetch('/limits', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-primary-user-id': userId
        },
        body: JSON.stringify({
          category,
          limit
        })
      })

      if (!response.ok) {
        console.error(`Ошибка восстановления лимита для ${category}`)
      }
    }

    console.log('✅ Лимиты стандартных категорий восстановлены')
    return true
  } catch (error) {
    console.error('❌ Ошибка восстановления лимитов:', error)
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
    restoreGoals?: boolean
    restoreBudget?: boolean
    restoreCategories?: boolean
    restoreLimits?: boolean
  } = {
    restoreTransactions: true,
    restoreAccounts: true,
    restoreGoals: true,
    restoreBudget: true,
    restoreCategories: true,
    restoreLimits: true
  }
): Promise<boolean> {
  try {
    const results: any[] = []
    let categoryIdMap: { [oldId: string]: string } = {}

    // Restore accounts first
    if (options.restoreAccounts && backup.data.accounts) {
      results.push(await restoreAccounts(userId, backup.data.accounts))
    }

    // Restore goals
    if (options.restoreGoals && backup.data.goals && backup.data.goals.length > 0) {
      results.push(await restoreGoals(userId, backup.data.goals))
    }

    // Restore budget settings
    if (options.restoreBudget && backup.data.budgetSettings) {
      results.push(await restoreBudgetSettings(userId, backup.data.budgetSettings))
    }

    // Restore custom categories and get ID mapping
    if (options.restoreCategories && backup.data.categories && backup.data.categories.length > 0) {
      categoryIdMap = await restoreCustomCategories(userId, backup.data.categories, backup.data.limits)
    }

    // Restore standard category limits (custom category limits are set during creation)
    if (options.restoreLimits && backup.data.limits) {
      results.push(await restoreCategoryLimits(userId, backup.data.limits))
    }

    // Restore transactions last, using category ID mapping
    if (options.restoreTransactions && backup.data.transactions) {
      results.push(await restoreTransactions(userId, backup.data.transactions, categoryIdMap))
    }

    return results.every(r => r === true || (typeof r === 'object' && Object.keys(r).length >= 0))
  } catch (error) {
    console.error('❌ Ошибка полного восстановления:', error)
    return false
  }
}
