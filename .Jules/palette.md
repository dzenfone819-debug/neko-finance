## 2024-05-22 - [Accessibility] Icon-Only Buttons
**Learning:** Icon-only buttons (like 'X' for close or delete) are invisible to screen readers without an `aria-label`. In `TransactionDetailModal`, critical actions like closing the modal, deleting photos, or navigating months were inaccessible.
**Action:** Always add `aria-label` to buttons that rely solely on icons for meaning.
