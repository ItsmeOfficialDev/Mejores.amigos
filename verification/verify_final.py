from playwright.sync_api import sync_playwright, expect

def test_final_features(page):
    # Setup login first to pass auth check
    page.goto("http://localhost:3001/")
    page.fill("input#name", "ishan")
    page.click("button[type='submit']")

    page.wait_for_url("**/hub.html")
    # Verify Hub Version Info
    expect(page.locator("text=STABLE v1.0.0 (BETA)")).to_be_visible()
    page.screenshot(path="verification/hub_v1.png")

    # Check TicTacToe Waiting State
    page.goto("http://localhost:3001/tictactoe.html")
    expect(page.locator("text=Waiting for Challenger...")).to_be_visible()
    page.screenshot(path="verification/ttt_waiting.png")

    print("Final features verified.")

if __name__ == "__main__":
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        try:
            test_final_features(page)
        except Exception as e:
            print(f"Error: {e}")
        finally:
            browser.close()
