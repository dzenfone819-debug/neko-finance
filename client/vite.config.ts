import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/balance': 'http://localhost:3000',
      '/stats': 'http://localhost:3000',
      '/transactions': 'http://localhost:3000',
      '/add-expense': 'http://localhost:3000',
      '/settings': 'http://localhost:3000',
      '/limits': 'http://localhost:3000',
      '/custom-categories': 'http://localhost:3000',
      '/accounts': 'http://localhost:3000',
      '/goals': 'http://localhost:3000',
      '/link-account': 'http://localhost:3000',
      '/unlink-account': 'http://localhost:3000',
      '/linked-accounts': 'http://localhost:3000',
      '/transfer': 'http://localhost:3000',
      '/log-client': 'http://localhost:3000',
      '/total-balance': 'http://localhost:3000',
      '/reset-all-data': 'http://localhost:3000',
      '/budget-period-settings': 'http://localhost:3000',
    }
  }
})
