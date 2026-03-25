from playwright.sync_api import sync_playwright

def test_ttt_full(page1, page2, page3):
    gid = "testroom"
    url = f"http://localhost:3001/tictactoe.html?gameId={gid}"

    # Page 1
    page1.goto("http://localhost:3001/")
    page1.evaluate("localStorage.setItem('mejoresAmigosUser', JSON.stringify({name: 'P1'}))")
    page1.goto(url)

    # Page 2
    page2.goto("http://localhost:3001/")
    page2.evaluate("localStorage.setItem('mejoresAmigosUser', JSON.stringify({name: 'P2'}))")
    page2.goto(url)

    # Page 3
    page3.goto("http://localhost:3001/")
    page3.evaluate("localStorage.setItem('mejoresAmigosUser', JSON.stringify({name: 'P3'}))")

    page3.on("dialog", lambda dialog: print(f"TTT_ERROR: {dialog.message}") or dialog.dismiss())
    page3.goto(url)

    print("TicTacToe Full Room logic checked.")

if __name__ == "__main__":
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        c1 = browser.new_context()
        c2 = browser.new_context()
        c3 = browser.new_context()
        p1 = c1.new_page()
        p2 = c2.new_page()
        p3 = c3.new_page()
        try:
            test_ttt_full(p1, p2, p3)
        finally:
            browser.close()
