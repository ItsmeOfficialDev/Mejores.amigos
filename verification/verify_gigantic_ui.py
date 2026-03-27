from playwright.sync_api import sync_playwright, expect

def test_gigantic_ui(page):
    # Setup login
    page.goto("http://localhost:3001/")
    page.fill("input#name", "ishan")
    page.click("button[type='submit']")
    page.wait_for_url("**/hub.html")

    # Navigate to Auction Arena
    page.goto("http://localhost:3001/auction/login")
    page.fill("input#a-name", "ishanadmin")
    page.wait_for_selector("input#a-pass", state="visible")
    page.fill("input#a-pass", "123456")
    page.click("button[type='submit']")
    page.wait_for_url("**/auction/lobby")

    # We can't easily start the auction without 4 players in a simple script,
    # but we can check the lobby UI for activity dots.
    page.screenshot(path="verification/gigantic_lobby.png")

    # Verify Entertainment Cinema UI
    page.goto("http://localhost:3001/entertainment.html")
    expect(page.locator("text=WATCH NOW")).to_be_visible()
    page.screenshot(path="verification/gigantic_cinema.png")

    print("Gigantic UI verification completed.")

if __name__ == "__main__":
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        # Mobile view simulation
        context = browser.new_context(viewport={"width": 390, "height": 844})
        page = context.new_page()
        try:
            test_gigantic_ui(page)
        except Exception as e:
            print(f"Error: {e}")
        finally:
            browser.close()
