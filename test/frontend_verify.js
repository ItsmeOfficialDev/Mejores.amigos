const { chromium } = require('playwright');

(async () => {
    const browser = await chromium.launch();
    const context = await browser.newContext();
    const page = await context.newPage();

    try {
        await page.goto('http://localhost:3000');
        await page.fill('#name', 'ishanadmin');
        await page.waitForSelector('#pass', { state: 'visible' });
        await page.fill('#pass', '123456');
        await page.click('button[type="submit"]');

        await page.waitForURL('**/hub.html');
        console.log('Hub page reached');
        await page.screenshot({ path: 'test_screenshots/hub.png' });

        // Try direct navigation to verify the page exists and works
        await page.goto('http://localhost:3000/auction/lobby.html');
        console.log('Directly navigating to Lobby');
        await page.waitForTimeout(1000);
        await page.screenshot({ path: 'test_screenshots/lobby_direct.png' });

        await page.goto('http://localhost:3000/auction/index.html');
        console.log('Directly navigating to Auction');
        await page.waitForTimeout(2000);
        await page.screenshot({ path: 'test_screenshots/auction_direct.png' });

    } catch (err) {
        console.error('Test failed:', err.message);
    } finally {
        await browser.close();
    }
})();
