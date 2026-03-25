from playwright.sync_api import sync_playwright, expect

def test_auction_flow(page):
    page.goto("http://localhost:3001/auction/login")

    # Join as admin
    page.fill("input#a-name", "ishanadmin")
    # Small delay for the field to appear
    page.wait_for_selector("input#a-pass", state="visible")
    page.fill("input#a-pass", "123456")
    page.click("button[type='submit']")

    # Check if joined
    page.wait_for_url("**/auction/lobby")
    page.wait_for_selector("#p-list")
    expect(page.locator("#p-list")).to_contain_text("Ishan")
    page.screenshot(path="verification/auction_lobby.png")

    # Try start (should be disabled with 1 player)
    start_btn = page.locator("#start-btn")
    # The start button is display: none for regular players, but ishanadmin is admin.
    # In lobby.html: user.isAuctionAdmin determines visibility.
    # api/auction/login returns isAuctionAdmin: true for "admin" suffix + correct password.

    expect(start_btn).to_be_visible()
    expect(start_btn).to_be_disabled()

    print("Auction Lobby verified. Start button correctly disabled for 1 player.")

if __name__ == "__main__":
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        try:
            test_auction_flow(page)
        except Exception as e:
            print(f"Error: {e}")
            page.screenshot(path="verification/error.png")
            # Log console messages
            page.on("console", lambda msg: print(f"CONSOLE: {msg.text}"))
        finally:
            browser.close()
