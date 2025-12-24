import WebApp from '@twa-dev/sdk';

/**
 * Safe wrapper for Telegram WebApp HapticFeedback.
 * Prevents crashes in environments where WebApp is not fully initialized.
 */
export const safeHaptic = {
  notificationOccurred: (type: 'error' | 'success' | 'warning') => {
    try {
      if (WebApp && WebApp.HapticFeedback) {
        WebApp.HapticFeedback.notificationOccurred(type);
      }
    } catch (e) {
      console.warn('Haptic feedback not available:', e);
    }
  },

  impactOccurred: (style: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft') => {
    try {
      if (WebApp && WebApp.HapticFeedback) {
        WebApp.HapticFeedback.impactOccurred(style);
      }
    } catch (e) {
      console.warn('Haptic feedback not available:', e);
    }
  },

  selectionChanged: () => {
    try {
      if (WebApp && WebApp.HapticFeedback) {
        WebApp.HapticFeedback.selectionChanged();
      }
    } catch (e) {
      console.warn('Haptic feedback not available:', e);
    }
  }
};
