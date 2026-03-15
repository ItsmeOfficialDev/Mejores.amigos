import asyncio
from playwright.async_api import async_playwright
import os

async def run():
    async with async_playwright() as p:
        browser = await p.chromium.launch()

        # 1. Join as Admin
        admin_page = await browser.new_page()
        print("Admin joining...")
        await admin_page.goto('http://localhost:3000')
        await admin_page.fill('#nameInput', 'ishanadmin')
        await admin_page.wait_for_selector('#adminPasswordField', state='visible')
        await admin_page.fill('#passwordInput', '123456')
        await admin_page.click('#joinBtn')
        await admin_page.wait_for_url('**/lobby.html')
        print("Admin in lobby.")
        await admin_page.screenshot(path='verification/admin_lobby.png')

        # 2. Join 3 more players
        players = ['Rohit', 'Virat', 'Rahul']
        player_pages = []
        for name in players:
            print(f"Player {name} joining...")
            page = await browser.new_page()
            await page.goto('http://localhost:3000')
            await page.fill('#nameInput', name)
            await page.click('#joinBtn')
            await page.wait_for_url('**/lobby.html')
            print(f"Player {name} in lobby.")
            player_pages.append(page)
            # DONT CLOSE PAGES
            player_pages.append(page)

        # 3. Admin starts auction
        print("Waiting for start auction button to be enabled...")
        await asyncio.sleep(2)

        try:
            await admin_page.wait_for_selector('#startBtn:not([disabled])', timeout=10000)
        except Exception as e:
            print(f"Timeout waiting for start button: {e}")
            await admin_page.screenshot(path='verification/timeout_lobby.png')
            content = await admin_page.content()
            print(f"Admin page content: {content[:1000]}...")
            await browser.close()
            return

        print("Start auction button enabled. Clicking...")
        await admin_page.screenshot(path='verification/admin_lobby_ready.png')

        await admin_page.click('#startBtn')

        # 4. Wait for redirect to auction.html
        print("Waiting for auction.html redirect...")
        await admin_page.wait_for_url('**/auction.html', timeout=10000)
        await asyncio.sleep(2)
        await admin_page.screenshot(path='verification/auction_screen.png')

        # 5. Place a bid
        print("Placing bid...")
        await admin_page.click('#mainBidBtn')
        await asyncio.sleep(1)
        await admin_page.screenshot(path='verification/auction_bid_placed.png')

        # 6. Check My Team modal
        print("Opening My Team...")
        await admin_page.click('#myTeamBtn')
        await asyncio.sleep(1)
        await admin_page.screenshot(path='verification/my_team_modal.png')
        await admin_page.locator('.close').click()

        # 7. Emergency End
        print("Emergency End...")
        await admin_page.click('#emergencyEndBtn')
        await admin_page.wait_for_selector('#emergencyModal', state='visible')
        await admin_page.fill('#emergencyConfirmInput', 'END')
        await admin_page.click('#confirmEmergencyEndBtn')

        print("Waiting for results.html redirect...")
        await admin_page.wait_for_url('**/results.html', timeout=10000)
        await asyncio.sleep(2)
        await admin_page.screenshot(path='verification/results_page.png')

        await browser.close()
        print("Verification complete.")

if __name__ == '__main__':
    if not os.path.exists('verification'):
        os.makedirs('verification')
    asyncio.run(run())
