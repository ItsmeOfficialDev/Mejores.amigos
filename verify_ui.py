import asyncio
from playwright.async_api import async_playwright

async def run():
    async_playwright_instance = await async_playwright().start()
    browser = await async_playwright_instance.chromium.launch()
    page = await browser.new_page()

    # Check Landing Page
    await page.goto('http://localhost:3000')
    await page.screenshot(path='landing_page.png')
    print("Landing page screenshot saved.")

    # Try Login
    await page.fill('input[placeholder="Enter your name"]', 'ishanadmin')
    await page.click('button:has-text("JOIN AUCTION")')
    await page.wait_for_selector('input[type="password"]')
    await page.fill('input[type="password"]', '123456')
    await page.click('button:has-text("JOIN AUCTION")')
    await page.wait_for_url('**/auction/lobby**')
    await page.screenshot(path='lobby_page.png')
    print("Lobby page screenshot saved.")

    await browser.close()
    await async_playwright_instance.stop()

if __name__ == "__main__":
    asyncio.run(run())
