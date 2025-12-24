from playwright.sync_api import sync_playwright
import time

def verify_reminders():
    with sync_playwright() as p:
        # Launch browser in headless mode
        browser = p.chromium.launch(headless=True)
        # Create a new context with mobile viewport to simulate the app environment
        context = browser.new_context(viewport={"width": 375, "height": 812})
        page = context.new_page()

        try:
            print("Navigating to app...")
            page.goto("http://localhost:5173")

            # Wait for app to load
            time.sleep(2)

            # Navigate to Settings tab
            print("Clicking Settings tab...")
            page.get_by_text("Настройки").click()
            time.sleep(1)

            # Click on Reminders button
            print("Clicking Reminders button...")
            page.get_by_text("Напоминания").click()
            time.sleep(1)

            # Take screenshot of empty reminders list
            print("Taking screenshot of reminders list...")
            page.screenshot(path="client/verification/reminders_list.png")

            # Open Add Reminder form
            print("Clicking Add button...")
            # The FAB button has a Plus icon, usually hard to select by text, so we use the button role
            # There might be multiple buttons, but the FAB is usually the last one or distinct
            # Let's try to find it by the svg inside or just use a selector for now if role is ambiguous
            # The FAB has z-index 100 and fixed position bottom right
            page.locator("button[style*='position: fixed']").click()
            time.sleep(1)

            # Take screenshot of the form
            print("Taking screenshot of reminder form...")
            page.screenshot(path="client/verification/reminder_form.png")

            # Fill form
            print("Filling form...")
            page.fill("input[placeholder='Например: Оплатить интернет']", "Test Reminder")

            # Save
            print("Saving...")
            page.get_by_text("Создать напоминание").click()
            time.sleep(2)

            # Take screenshot of list with reminder
            print("Taking screenshot of updated list...")
            page.screenshot(path="client/verification/reminders_list_populated.png")

        except Exception as e:
            print(f"Error: {e}")
            page.screenshot(path="client/verification/error.png")
        finally:
            browser.close()

if __name__ == "__main__":
    verify_reminders()
