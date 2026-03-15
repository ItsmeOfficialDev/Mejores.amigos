import asyncio
from playwright.async_api import async_playwright
import os

async def run():
    async with async_playwright() as p:
        browser = await p.chromium.launch()

        # 1. Join as Admin
        admin_page = await browser.new_page()
        await admin_page.goto('http://localhost:3000')
        await admin_page.fill('#nameInput', 'ishanadmin')
        await admin_page.fill('#passwordInput', '123456')
        await admin_page.click('#joinBtn')
        await admin_page.wait_for_url('**/lobby.html')

        # 2. Join 3 more players
        for name in ['Rohit', 'Virat', 'Rahul']:
            page = await browser.new_page()
            await page.goto('http://localhost:3000')
            await page.fill('#nameInput', name)
            await page.click('#joinBtn')
            await page.wait_for_url('**/lobby.html')

        # 3. Admin starts auction
        await admin_page.wait_for_selector('#startBtn:not([disabled])')
        await admin_page.click('#startBtn')
        await admin_page.wait_for_url('**/auction.html')

        # Take screenshot of emergency modal
        await admin_page.click('#emergencyEndBtn')
        await admin_page.wait_for_selector('#emergencyModal', state='visible')
        await admin_page.screenshot(path='verification/emergency_modal_open.png')

        # Test validation on emergency modal
        await admin_page.fill('#emergencyConfirmInput', 'EN')
        # confirm button should be disabled
        is_disabled = await admin_page.is_disabled('#confirmEmergencyEndBtn')
        print(f"Confirm button disabled for 'EN': {is_disabled}")

        await admin_page.fill('#emergencyConfirmInput', 'END')
        is_disabled = await admin_page.is_disabled('#confirmEmergencyEndBtn')
        print(f"Confirm button disabled for 'END': {is_disabled}")

        await admin_page.screenshot(path='verification/emergency_modal_filled.png')

        await browser.close()

if __name__ == '__main__':
    if not os.path.exists('verification'):
        os.makedirs('verification')
    asyncio.run(run())
