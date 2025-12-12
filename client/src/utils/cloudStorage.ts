/**
 * Telegram Cloud Storage utility for data synchronization
 * Uses Telegram WebApp Cloud Storage API to backup and restore data
 */

interface CloudStorageData {
  transactions: any[]
  accounts: any[]
  goals: any[]
  budgetSettings: any
  categories: any[]
  limits: any
  lastSyncTime: number
}

const CLOUD_KEYS = {
  TRANSACTIONS: 'neko_transactions',
  ACCOUNTS: 'neko_accounts',
  GOALS: 'neko_goals',
  BUDGET: 'neko_budget',
  CATEGORIES: 'neko_categories',
  LIMITS: 'neko_limits',
  LAST_SYNC: 'neko_last_sync'
}

class CloudStorage {
  private cloudStorage: any

  constructor() {
    // @ts-ignore
    this.cloudStorage = window.Telegram?.WebApp?.CloudStorage
  }

  /**
   * Check if cloud storage is available
   */
  isAvailable(): boolean {
    return !!this.cloudStorage
  }

  /**
   * Save data to cloud storage
   */
  async saveToCloud(data: Partial<CloudStorageData>): Promise<boolean> {
    if (!this.isAvailable()) {
      console.warn('Cloud Storage не доступен')
      return false
    }

    try {
      const promises: Promise<void>[] = []

      if (data.transactions) {
        promises.push(this.setItem(CLOUD_KEYS.TRANSACTIONS, JSON.stringify(data.transactions)))
      }

      if (data.accounts) {
        promises.push(this.setItem(CLOUD_KEYS.ACCOUNTS, JSON.stringify(data.accounts)))
      }

      if (data.goals) {
        promises.push(this.setItem(CLOUD_KEYS.GOALS, JSON.stringify(data.goals)))
      }

      if (data.budgetSettings) {
        promises.push(this.setItem(CLOUD_KEYS.BUDGET, JSON.stringify(data.budgetSettings)))
      }

      if (data.categories) {
        promises.push(this.setItem(CLOUD_KEYS.CATEGORIES, JSON.stringify(data.categories)))
      }

      if (data.limits) {
        promises.push(this.setItem(CLOUD_KEYS.LIMITS, JSON.stringify(data.limits)))
      }

      // Save last sync time
      promises.push(this.setItem(CLOUD_KEYS.LAST_SYNC, Date.now().toString()))

      await Promise.all(promises)
      console.log('✅ Данные сохранены в облако')
      return true
    } catch (error) {
      console.error('❌ Ошибка сохранения в облако:', error)
      return false
    }
  }

  /**
   * Load data from cloud storage
   */
  async loadFromCloud(): Promise<CloudStorageData | null> {
    if (!this.isAvailable()) {
      console.warn('Cloud Storage не доступен')
      return null
    }

    try {
      const keys = Object.values(CLOUD_KEYS)
      const values = await this.getItems(keys)

      const data: CloudStorageData = {
        transactions: values[CLOUD_KEYS.TRANSACTIONS] 
          ? JSON.parse(values[CLOUD_KEYS.TRANSACTIONS]) 
          : [],
        accounts: values[CLOUD_KEYS.ACCOUNTS] 
          ? JSON.parse(values[CLOUD_KEYS.ACCOUNTS]) 
          : [],
        goals: values[CLOUD_KEYS.GOALS] 
          ? JSON.parse(values[CLOUD_KEYS.GOALS]) 
          : [],
        budgetSettings: values[CLOUD_KEYS.BUDGET] 
          ? JSON.parse(values[CLOUD_KEYS.BUDGET]) 
          : null,
        categories: values[CLOUD_KEYS.CATEGORIES] 
          ? JSON.parse(values[CLOUD_KEYS.CATEGORIES]) 
          : [],
        limits: values[CLOUD_KEYS.LIMITS] 
          ? JSON.parse(values[CLOUD_KEYS.LIMITS]) 
          : {},
        lastSyncTime: values[CLOUD_KEYS.LAST_SYNC] 
          ? parseInt(values[CLOUD_KEYS.LAST_SYNC]) 
          : 0
      }

      console.log('✅ Данные загружены из облака')
      return data
    } catch (error) {
      console.error('❌ Ошибка загрузки из облака:', error)
      return null
    }
  }

  /**
   * Clear all data from cloud storage
   */
  async clearCloud(): Promise<boolean> {
    if (!this.isAvailable()) {
      return false
    }

    try {
      const keys = Object.values(CLOUD_KEYS)
      await this.removeItems(keys)
      console.log('✅ Облачное хранилище очищено')
      return true
    } catch (error) {
      console.error('❌ Ошибка очистки облака:', error)
      return false
    }
  }

  /**
   * Get last sync time
   */
  async getLastSyncTime(): Promise<number> {
    if (!this.isAvailable()) {
      return 0
    }

    try {
      const value = await this.getItem(CLOUD_KEYS.LAST_SYNC)
      return value ? parseInt(value) : 0
    } catch {
      return 0
    }
  }

  /**
   * Helper: Set single item in cloud storage
   */
  private setItem(key: string, value: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.cloudStorage.setItem(key, value, (error: any, success: boolean) => {
        if (error || !success) {
          reject(error || new Error('Failed to set item'))
        } else {
          resolve()
        }
      })
    })
  }

  /**
   * Helper: Get single item from cloud storage
   */
  private getItem(key: string): Promise<string | null> {
    return new Promise((resolve, reject) => {
      this.cloudStorage.getItem(key, (error: any, value: string) => {
        if (error) {
          reject(error)
        } else {
          resolve(value || null)
        }
      })
    })
  }

  /**
   * Helper: Get multiple items from cloud storage
   */
  private getItems(keys: string[]): Promise<Record<string, string>> {
    return new Promise((resolve, reject) => {
      this.cloudStorage.getItems(keys, (error: any, values: Record<string, string>) => {
        if (error) {
          reject(error)
        } else {
          resolve(values || {})
        }
      })
    })
  }

  /**
   * Helper: Remove multiple items from cloud storage
   */
  private removeItems(keys: string[]): Promise<void> {
    return new Promise((resolve, reject) => {
      this.cloudStorage.removeItems(keys, (error: any, success: boolean) => {
        if (error || !success) {
          reject(error || new Error('Failed to remove items'))
        } else {
          resolve()
        }
      })
    })
  }
}

// Export singleton instance
export const cloudStorage = new CloudStorage()
