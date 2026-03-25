from playwright.sync_api import sync_playwright, expect

def test_premium_ui(page):
    # Check Login Page
    page.goto("http://localhost:3001/auction/login")
    page.screenshot(path="verification/auction_login_premium.png")

    # Check Lobby
    page.fill("input#a-name", "ishanadmin")
    page.wait_for_selector("input#a-pass", state="visible")
    page.fill("input#a-pass", "123456")
    page.click("button[type='submit']")

    page.wait_for_url("**/auction/lobby")
    page.wait_for_selector("#p-list")
    page.screenshot(path="verification/auction_lobby_premium.png")

    print("Premium UI screenshots taken.")

if __name__ == "__main__":
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        try:
            test_premium_ui(page)
        except Exception as e:
            print(f"Error: {e}")
        finally:
            browser.close()
